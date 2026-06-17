using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using AdminApp.Components;
using AdminApp.Components.Account;
using AdminApp.Data;
using AdminApp.Services;
using ClosedXML.Excel;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Transforms;

namespace AdminApp;

/// <summary>앱 시작(=재배포)마다 바뀌는 정적 자원 캐시 버스팅 스탬프.</summary>
public static class AssetVersion
{
    public static readonly string Stamp = DateTime.UtcNow.Ticks.ToString("x");
}

public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Razor / Blazor
        builder.Services.AddRazorComponents()
            .AddInteractiveServerComponents();

        // 끊긴 회로를 오래 보존 → 탭을 열어둔 채 몇 시간 뒤 돌아와도 같은 회로로 재연결.
        // (작업하던 화면 상태가 그대로 살아남. 소규모 사내 사용이라 메모리 부담 적음)
        builder.Services.Configure<Microsoft.AspNetCore.Components.Server.CircuitOptions>(options =>
        {
            options.DisconnectedCircuitRetentionPeriod = TimeSpan.FromHours(6);  // 30분 → 6시간
            options.DisconnectedCircuitMaxRetained = 200;
        });

        // SignalR keep-alive 강화 — 서버가 주기적으로 핑을 보내 연결을 살려둠.
        // 탭 비활성으로 클라 핑이 느려져도 넉넉히 버티도록 ClientTimeoutInterval을 크게.
        builder.Services.Configure<Microsoft.AspNetCore.SignalR.HubOptions>(options =>
        {
            options.KeepAliveInterval = TimeSpan.FromSeconds(10);      // 10초마다 핑
            options.ClientTimeoutInterval = TimeSpan.FromMinutes(5);   // 5분간 무응답이어야 끊김 판정
            options.HandshakeTimeout = TimeSpan.FromSeconds(30);
            options.MaximumParallelInvocationsPerClient = 2;
        });

        builder.Services.AddCascadingAuthenticationState();
        builder.Services.AddScoped<IdentityUserAccessor>();
        builder.Services.AddScoped<IdentityRedirectManager>();
        builder.Services.AddScoped<AuthenticationStateProvider, IdentityRevalidatingAuthenticationStateProvider>();

        builder.Services.AddAuthentication(options =>
            {
                options.DefaultScheme = IdentityConstants.ApplicationScheme;
                options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
            })
            .AddIdentityCookies();

        // 로그인 유지(자동 로그인) — "로그인 상태 유지" 체크 시 30일간 쿠키 유지 + 슬라이딩 연장.
        builder.Services.ConfigureApplicationCookie(options =>
        {
            options.ExpireTimeSpan = TimeSpan.FromDays(30);
            options.SlidingExpiration = true;
            options.LoginPath = "/Account/Login";
        });

        // DB — Blazor Server 동시성 문제 회피를 위해 DbContextFactory 사용.
        // 컴포넌트는 IDbContextFactory로 작업마다 독립 컨텍스트를 생성하고,
        // Identity(UserManager 등)는 팩토리에서 만든 scoped 컨텍스트를 사용.
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
        var serverVersion = new MariaDbServerVersion(new Version(10, 11, 0));
        builder.Services.AddDbContextFactory<ApplicationDbContext>(options =>
            options.UseMySql(connectionString, serverVersion));
        builder.Services.AddScoped<ApplicationDbContext>(sp =>
            sp.GetRequiredService<IDbContextFactory<ApplicationDbContext>>().CreateDbContext());
        builder.Services.AddDatabaseDeveloperPageExceptionFilter();

        // Identity + Roles
        builder.Services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.SignIn.RequireConfirmedAccount = false; // 사내 시스템이므로 이메일 인증 생략
                options.Password.RequiredLength = 6;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireLowercase = false;       // 주민번호 6자리(숫자) 임시비번 허용
                options.Password.RequireDigit = true;
            })
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

        // KoreanName 클레임 추가 (NavMenu 등에서 화면 표시용)
        builder.Services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, AdditionalUserClaimsPrincipalFactory>();

        builder.Services.AddSingleton<IEmailSender<ApplicationUser>, IdentityNoOpEmailSender>();

        // Brave Search 클라이언트 + 매일 자동 수집 백그라운드 서비스
        builder.Services.AddHttpClient<BraveSearchService>(c =>
        {
            c.BaseAddress = new Uri("https://api.search.brave.com");
            c.DefaultRequestHeaders.Add("Accept", "application/json");
            var key = builder.Configuration["Brave:ApiKey"] ?? "";
            if (!string.IsNullOrEmpty(key))
            {
                c.DefaultRequestHeaders.Add("X-Subscription-Token", key);
            }
        })
        .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
        {
            // Brave가 gzip으로 응답해도 자동 해제하도록
            AutomaticDecompression = System.Net.DecompressionMethods.All
        });
        builder.Services.AddSingleton<InsightFetcherService>();
        builder.Services.AddHostedService(sp => sp.GetRequiredService<InsightFetcherService>());

        // 편집 가능 텍스트 서비스 (싱글톤 — 메모리 캐시)
        builder.Services.AddSingleton<EditableTextService>();

        // 웹 푸시 발송 서비스
        builder.Services.AddSingleton<PushNotificationService>();

        // 페이지 사용 통계 서비스
        builder.Services.AddSingleton<PageStatService>();

        // Admin role 기반 인가 정책
        builder.Services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
            // 프로젝트 관리(PM)는 Admin·Employee만 — 게스트(협력사)는 /pm 접근 자체를 차단
            options.AddPolicy("PmAccess", policy => policy.RequireRole("Admin", "Employee"));
        });

        // 프로젝트 관리(PM) 리버스 프록시 — /pm/* → PM 컨테이너. 어드민과 같은 origin/경로로 서빙.
        var pmInternal = builder.Configuration["Pm:InternalUrl"] ?? "http://pm:3001";
        builder.Services.AddReverseProxy().LoadFromMemory(
            new[]
            {
                new Yarp.ReverseProxy.Configuration.RouteConfig
                {
                    RouteId = "pm",
                    ClusterId = "pmCluster",
                    AuthorizationPolicy = "PmAccess",   // 게스트 차단 (Admin·Employee만)
                    Match = new Yarp.ReverseProxy.Configuration.RouteMatch { Path = "/pm/{**catch-all}" }
                }.WithTransformPathRemovePrefix("/pm")
            },
            new[]
            {
                new Yarp.ReverseProxy.Configuration.ClusterConfig
                {
                    ClusterId = "pmCluster",
                    Destinations = new Dictionary<string, Yarp.ReverseProxy.Configuration.DestinationConfig>
                    {
                        ["pm"] = new Yarp.ReverseProxy.Configuration.DestinationConfig { Address = pmInternal }
                    }
                }
            });

        var app = builder.Build();

        // 마이그레이션 적용 + 초기 Admin 시드
        using (var scope = app.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            await SeedData.InitializeAsync(services);
        }

        // HTTP 파이프라인
        if (app.Environment.IsDevelopment())
        {
            app.UseMigrationsEndPoint();
        }
        else
        {
            app.UseExceptionHandler("/Error");
            app.UseHsts();
        }

        // app.UseHttpsRedirection();

        app.UseStaticFiles();
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseAntiforgery();

        // 페이지 방문 통계 — 인증된 페이지 GET 요청을 역할별로 집계
        app.Use(async (context, next) =>
        {
            await next();
            try
            {
                if (HttpMethods.IsGet(context.Request.Method)
                    && context.Response.StatusCode == 200
                    && context.User?.Identity?.IsAuthenticated == true)
                {
                    var page = PageStatService.MapPage(context.Request.Path.Value ?? "");
                    if (!string.IsNullOrEmpty(page))
                    {
                        var u = context.User;
                        var role = u.IsInRole("Admin") ? "Admin"
                                 : u.IsInRole("Employee") ? "Employee"
                                 : u.IsInRole("Guest") ? "Guest" : null;
                        if (role != null)
                        {
                            var svc = context.RequestServices.GetRequiredService<PageStatService>();
                            _ = svc.RecordAsync(role, page);
                        }
                    }
                }
            }
            catch { /* 통계 실패 무시 */ }
        });

        app.MapRazorComponents<App>()
            .AddInteractiveServerRenderMode();

        app.MapAdditionalIdentityEndpoints();

        // ========================== 푸시 알림 API ==========================
        // VAPID 키 한 번 초기화 (앱 시작 직후 호출)
        using (var initScope = app.Services.CreateScope())
        {
            var pushSvc = initScope.ServiceProvider.GetRequiredService<PushNotificationService>();
            await pushSvc.EnsureVapidAsync();
        }

        // 클라이언트가 VAPID public key 요청 (구독 시 필요)
        app.MapGet("/api/push/vapid-public-key", (PushNotificationService push) =>
            Results.Json(new { publicKey = push.GetPublicKey() }));

        // 푸시 구독 등록 (로그인 필요)
        app.MapPost("/api/push/subscribe", async (
            PushSubscribeRequest req,
            HttpContext ctx,
            IDbContextFactory<ApplicationDbContext> dbFactory) =>
        {
            var userId = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(req.Endpoint)) return Results.BadRequest("endpoint required");

            await using var db = await dbFactory.CreateDbContextAsync();
            var existing = await db.PushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == req.Endpoint);
            if (existing == null)
            {
                db.PushSubscriptions.Add(new PushSubscriptionEntry
                {
                    UserId = userId,
                    Endpoint = req.Endpoint,
                    P256dh = req.P256dh ?? "",
                    Auth = req.Auth ?? "",
                    UserAgent = req.UserAgent,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.UserId = userId;
                existing.P256dh = req.P256dh ?? existing.P256dh;
                existing.Auth = req.Auth ?? existing.Auth;
                existing.UserAgent = req.UserAgent ?? existing.UserAgent;
            }
            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();

        // 푸시 구독 해제
        app.MapPost("/api/push/unsubscribe", async (
            PushUnsubscribeRequest req,
            HttpContext ctx,
            IDbContextFactory<ApplicationDbContext> dbFactory) =>
        {
            var userId = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(req.Endpoint)) return Results.BadRequest();
            await using var db = await dbFactory.CreateDbContextAsync();
            await db.PushSubscriptions
                .Where(s => s.Endpoint == req.Endpoint && s.UserId == userId)
                .ExecuteDeleteAsync();
            return Results.Ok();
        }).RequireAuthorization();

        // 공지 첨부파일 다운로드 (로그인 필요)
        app.MapGet("/notices/attachments/{id:int}", async (int id, IDbContextFactory<ApplicationDbContext> dbFactory) =>
        {
            await using var db = await dbFactory.CreateDbContextAsync();
            var att = await db.NoticeAttachments.FindAsync(id);
            if (att == null) return Results.NotFound();
            return Results.File(att.Content, att.ContentType ?? "application/octet-stream", att.FileName);
        }).RequireAuthorization();

        // 사내 문서 첨부파일 다운로드 (직원/관리자만 — Guest 차단)
        app.MapGet("/documents/attachments/{id:int}", async (int id, IDbContextFactory<ApplicationDbContext> dbFactory) =>
        {
            await using var db = await dbFactory.CreateDbContextAsync();
            var att = await db.CompanyDocumentAttachments.FindAsync(id);
            if (att == null) return Results.NotFound();
            return Results.File(att.Content, att.ContentType ?? "application/octet-stream", att.FileName);
        }).RequireAuthorization(new Microsoft.AspNetCore.Authorization.AuthorizeAttribute { Roles = "Admin,Employee" });

        // 월별 근태 엑셀 리포트 (관리자 전용)
        app.MapGet("/admin/attendance/export", async (int year, int month, IDbContextFactory<ApplicationDbContext> dbFactory) =>
        {
            if (month < 1 || month > 12) return Results.BadRequest("invalid month");
            var first = new DateOnly(year, month, 1);
            var last = first.AddMonths(1).AddDays(-1);

            await using var db = await dbFactory.CreateDbContextAsync();
            var recs = await db.AttendanceRecords.AsNoTracking()
                .Where(r => r.WorkDate >= first && r.WorkDate <= last)
                .OrderBy(r => r.WorkDate).ThenBy(r => r.EmployeeNumber)
                .ToListAsync();
            var users = await db.Users.AsNoTracking().ToListAsync();
            var udict = users.ToDictionary(u => u.Id, u => u);

            using var wb = new XLWorkbook();
            var ws = wb.AddWorksheet($"{year}-{month:00}");
            string[] headers = { "날짜", "사번", "이름", "출근", "퇴근", "근무시간(분)", "지각" };
            for (int i = 0; i < headers.Length; i++)
            {
                ws.Cell(1, i + 1).Value = headers[i];
                ws.Cell(1, i + 1).Style.Font.Bold = true;
            }

            int row = 2;
            foreach (var r in recs)
            {
                ApplicationUser? u = r.UserId != null && udict.TryGetValue(r.UserId, out var uu) ? uu : null;
                var start = u?.ScheduledStartTime ?? new TimeOnly(9, 0);
                bool late = r.CheckIn.HasValue && r.CheckIn.Value > start;
                int? mins = (r.CheckIn.HasValue && r.CheckOut.HasValue && r.CheckOut.Value > r.CheckIn.Value)
                    ? (int)(r.CheckOut.Value - r.CheckIn.Value).TotalMinutes : null;

                ws.Cell(row, 1).Value = r.WorkDate.ToString("yyyy-MM-dd");
                ws.Cell(row, 2).Value = r.EmployeeNumber;
                ws.Cell(row, 3).Value = u?.KoreanName ?? "(미매칭)";
                ws.Cell(row, 4).Value = r.CheckIn?.ToString("HH:mm") ?? "";
                ws.Cell(row, 5).Value = r.CheckOut?.ToString("HH:mm") ?? "";
                if (mins.HasValue) ws.Cell(row, 6).Value = mins.Value; else ws.Cell(row, 6).Value = "";
                ws.Cell(row, 7).Value = late ? "지각" : (r.CheckIn.HasValue ? "정상" : "");
                row++;
            }
            ws.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return Results.File(ms.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"근태_{year}-{month:00}.xlsx");
        }).RequireAuthorization("AdminOnly");

        // ========================== 프로젝트 관리(SCON_PJ) SSO ==========================
        // 어드민 우상단 버튼 → 이 엔드포인트 → 핸드오프 JWT 발급 → 같은 origin의 /pm/?sso= 로 리다이렉트.
        // /pm/* 는 위에서 등록한 YARP 리버스 프록시가 PM 컨테이너로 전달한다. (게스트 제외)
        app.MapGet("/pm-launch", async (HttpContext ctx, UserManager<ApplicationUser> userManager, IConfiguration config) =>
        {
            var user = await userManager.GetUserAsync(ctx.User);
            if (user == null) return Results.Challenge();

            var roles = await userManager.GetRolesAsync(user);
            var pmRole = roles.Contains("Admin") ? "admin" : "member";

            var secret = config["Pm:JwtSecret"] ?? "";
            if (string.IsNullOrEmpty(secret))
                return Results.Problem("프로젝트 관리 연동이 구성되지 않았습니다. (Pm:JwtSecret)");

            var token = PmTokenService.Mint(secret, new Dictionary<string, object>
            {
                ["id"]         = user.Id,
                ["name"]       = user.KoreanName ?? user.UserName ?? user.Email ?? user.Id,
                ["email"]      = user.Email ?? $"{user.Id}@intra.local",
                ["role"]       = pmRole,
                ["department"] = user.Department ?? "",
            }, TimeSpan.FromMinutes(5));

            // 상대 경로 → 리버스 프록시가 /pm 을 PM 컨테이너로 전달
            return Results.Redirect($"/pm/?sso={Uri.EscapeDataString(token)}");
        }).RequireAuthorization(new Microsoft.AspNetCore.Authorization.AuthorizeAttribute { Roles = "Admin,Employee" });

        // PM 리버스 프록시 (/pm/* → PM 컨테이너)
        app.MapReverseProxy();

        app.Run();
    }
}

// 푸시 구독 API 페이로드
public record PushSubscribeRequest(string Endpoint, string? P256dh, string? Auth, string? UserAgent);
public record PushUnsubscribeRequest(string Endpoint);
