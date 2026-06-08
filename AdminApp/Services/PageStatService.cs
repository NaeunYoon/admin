using AdminApp.Data;
using Microsoft.EntityFrameworkCore;

namespace AdminApp.Services;

/// <summary>
/// 역할별 페이지 방문 횟수 집계. 방문 시 +1 (실시간).
/// </summary>
public class PageStatService(
    IDbContextFactory<ApplicationDbContext> dbFactory,
    ILogger<PageStatService> logger)
{
    public async Task RecordAsync(string role, string page)
    {
        if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(page)) return;
        try
        {
            await using var db = await dbFactory.CreateDbContextAsync();
            var stat = await db.PageStats.FirstOrDefaultAsync(s => s.Role == role && s.Page == page);
            if (stat == null)
            {
                db.PageStats.Add(new PageStat { Role = role, Page = page, Count = 1, LastVisitUtc = DateTime.UtcNow });
            }
            else
            {
                stat.Count++;
                stat.LastVisitUtc = DateTime.UtcNow;
            }
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // 동시성 충돌(드문 경우) 등은 무시 — 통계는 정밀도보다 가용성 우선
            logger.LogDebug(ex, "페이지 통계 기록 실패: {Role}/{Page}", role, page);
        }
    }

    /// <summary>URL 경로 → 사람이 읽는 페이지 이름. 통계 대상 아닌 경로는 빈 문자열.</summary>
    public static string MapPage(string path)
    {
        path = (path ?? "").Split('?')[0].TrimEnd('/');
        if (string.IsNullOrEmpty(path)) return "홈";

        if (path.StartsWith("/notices/attachments", StringComparison.OrdinalIgnoreCase)) return "";
        if (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)) return "";
        if (path.StartsWith("/Account", StringComparison.OrdinalIgnoreCase)) return "";
        if (path.StartsWith("/notices/", StringComparison.OrdinalIgnoreCase)) return "공지 상세";
        if (path.StartsWith("/insights/", StringComparison.OrdinalIgnoreCase)) return "인사이트 상세";

        return path.ToLowerInvariant() switch
        {
            "/profile" => "내 정보",
            "/requests" => "연차/추가근무 상신",
            "/attendance" => "내 근태",
            "/supplies" => "비품/간식 요청",
            "/shared" => "공용 기기/계정",
            "/reservations" => "회의실 예약",
            "/insights" => "인사이트 아카이브",
            "/bugs" => "버그 트래커",
            "/notifications" => "알림함",
            "/recycle" => "분리배출 도우미",
            "/admin/requests" => "[관리] 신청 관리",
            "/admin/users" => "[관리] 직원 관리",
            "/admin/attendance" => "[관리] 근태 관리",
            "/admin/schedules" => "[관리] 근무 일정",
            "/admin/employees/new" => "[관리] 직원 등록",
            "/admin/message" => "[관리] 메시지 보내기",
            "/admin/recurring-meetings" => "[관리] 정기 회의",
            "/admin/texts" => "[관리] 화면 문구",
            "/admin/analytics" => "[관리] 사용 통계",
            _ => "",
        };
    }
}
