using System.Text.Json;
using AdminApp.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace AdminApp.Services;

/// <summary>
/// 웹 푸시(VAPID 기반) 발송 서비스. VAPID 키는 DB AppSetting에 1회 생성·저장.
/// </summary>
public class PushNotificationService(
    IDbContextFactory<ApplicationDbContext> dbFactory,
    IServiceScopeFactory scopeFactory,
    ILogger<PushNotificationService> logger)
{
    private VapidDetails? _vapid;
    private readonly SemaphoreSlim _vapidLock = new(1, 1);
    private const string VapidPubKey = "push.vapid.public";
    private const string VapidPrivKey = "push.vapid.private";
    private const string VapidSubject = "mailto:admin@admin.com";

    /// <summary>VAPID 키 (없으면 새로 생성해 DB에 저장). 시작 시 한 번 호출.</summary>
    public async Task<VapidDetails> EnsureVapidAsync()
    {
        if (_vapid != null) return _vapid;
        await _vapidLock.WaitAsync();
        try
        {
            if (_vapid != null) return _vapid;
            await using var db = await dbFactory.CreateDbContextAsync();
            var pub = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == VapidPubKey);
            var priv = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == VapidPrivKey);
            if (pub == null || priv == null)
            {
                var keys = VapidHelper.GenerateVapidKeys();
                db.AppSettings.Add(new AppSetting { Key = VapidPubKey, Value = keys.PublicKey, UpdatedAt = DateTime.UtcNow });
                db.AppSettings.Add(new AppSetting { Key = VapidPrivKey, Value = keys.PrivateKey, UpdatedAt = DateTime.UtcNow });
                await db.SaveChangesAsync();
                _vapid = new VapidDetails(VapidSubject, keys.PublicKey, keys.PrivateKey);
                logger.LogInformation("VAPID 키 새로 생성됨 (public 길이 {Len})", keys.PublicKey.Length);
            }
            else
            {
                _vapid = new VapidDetails(VapidSubject, pub.Value, priv.Value);
            }
            return _vapid;
        }
        finally { _vapidLock.Release(); }
    }

    public string GetPublicKey() => _vapid?.PublicKey ?? "";

    /// <summary>특정 사용자에게 알림 발송 (앱 내 인박스 저장 + 푸시).</summary>
    public async Task SendToUserAsync(string userId, string title, string body, string url = "/", string? category = null)
    {
        if (string.IsNullOrEmpty(userId)) return;
        await EnsureVapidAsync();

        // 사용자 알림 OFF면 건너뜀
        using (var scope = scopeFactory.CreateScope())
        {
            var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await userMgr.FindByIdAsync(userId);
            if (user == null || !user.NotificationsEnabled) return;
        }

        await using var db = await dbFactory.CreateDbContextAsync();

        // 1) 앱 내 인박스 저장
        db.NotificationItems.Add(new NotificationItem
        {
            UserId = userId,
            Title = title,
            Body = body,
            Url = url,
            Category = category,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        // 2) 푸시 발송
        var subs = await db.PushSubscriptions.AsNoTracking()
            .Where(s => s.UserId == userId).ToListAsync();
        if (subs.Count > 0)
            await SendAsync(subs, title, body, url);
    }

    /// <summary>Admin 역할 모두에게 알림 (앱 내 인박스 + 푸시).</summary>
    public async Task SendToAdminsAsync(string title, string body, string url = "/", string? category = null)
    {
        await EnsureVapidAsync();

        // NotificationsEnabled 켜진 관리자만
        List<string> ids;
        using (var scope = scopeFactory.CreateScope())
        {
            var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var admins = await userMgr.GetUsersInRoleAsync("Admin");
            ids = admins.Where(a => a.NotificationsEnabled).Select(a => a.Id).ToList();
        }
        if (ids.Count == 0) return;

        await using var db = await dbFactory.CreateDbContextAsync();

        // 1) 모든 관리자에게 앱 내 인박스 저장
        foreach (var id in ids)
        {
            db.NotificationItems.Add(new NotificationItem
            {
                UserId = id, Title = title, Body = body, Url = url, Category = category,
                CreatedAt = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync();

        // 2) 푸시 발송
        var subs = await db.PushSubscriptions.AsNoTracking()
            .Where(s => ids.Contains(s.UserId)).ToListAsync();
        if (subs.Count > 0)
            await SendAsync(subs, title, body, url);
    }

    /// <summary>
    /// 선택한 역할들에 속한 모든 사용자에게 알림 발송 (앱 인박스 + 푸시).
    /// 한 사용자가 여러 역할이어도 중복 없이 1회만. 알림 OFF 사용자는 제외.
    /// 반환: (대상 인원 수, 그 중 푸시 구독 보유 인원 수)
    /// </summary>
    public async Task<(int Recipients, int PushDevices)> SendToRolesAsync(
        IEnumerable<string> roles, string title, string body, string url = "/", string? category = null)
    {
        await EnsureVapidAsync();

        var ids = new HashSet<string>();
        using (var scope = scopeFactory.CreateScope())
        {
            var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            foreach (var role in roles.Distinct())
            {
                var users = await userMgr.GetUsersInRoleAsync(role);
                foreach (var u in users)
                    if (u.NotificationsEnabled) ids.Add(u.Id);
            }
        }
        if (ids.Count == 0) return (0, 0);

        await using var db = await dbFactory.CreateDbContextAsync();

        // 1) 앱 내 인박스 저장 (모든 대상)
        foreach (var id in ids)
        {
            db.NotificationItems.Add(new NotificationItem
            {
                UserId = id, Title = title, Body = body, Url = url, Category = category,
                CreatedAt = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync();

        // 2) 푸시 발송 (구독 보유자만)
        var subs = await db.PushSubscriptions.AsNoTracking()
            .Where(s => ids.Contains(s.UserId)).ToListAsync();
        if (subs.Count > 0)
            await SendAsync(subs, title, body, url);

        return (ids.Count, subs.Select(s => s.UserId).Distinct().Count());
    }

    private async Task SendAsync(List<PushSubscriptionEntry> subs, string title, string body, string url)
    {
        if (_vapid == null) return;
        // 아이콘 URL에 캐시 버스팅 버전 → 파비콘(고래) 교체 시 알림 아이콘도 갱신됨
        var iconUrl = $"/favicon.png?v={AdminApp.AssetVersion.Stamp}";
        var payload = JsonSerializer.Serialize(new { title, body, url, icon = iconUrl, badge = iconUrl });
        var client = new WebPushClient();
        var deadSubs = new List<int>();

        foreach (var s in subs)
        {
            try
            {
                var ps = new WebPush.PushSubscription(s.Endpoint, s.P256dh, s.Auth);
                await client.SendNotificationAsync(ps, payload, _vapid);
            }
            catch (WebPushException ex) when (
                ex.StatusCode == System.Net.HttpStatusCode.NotFound ||
                ex.StatusCode == System.Net.HttpStatusCode.Gone)
            {
                // 구독 만료 → DB에서 정리
                deadSubs.Add(s.Id);
                logger.LogInformation("푸시 구독 만료 — 제거 예정 (id={Id})", s.Id);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "푸시 발송 실패 (id={Id})", s.Id);
            }
        }

        if (deadSubs.Count > 0)
        {
            await using var db = await dbFactory.CreateDbContextAsync();
            await db.PushSubscriptions.Where(x => deadSubs.Contains(x.Id)).ExecuteDeleteAsync();
        }
    }
}
