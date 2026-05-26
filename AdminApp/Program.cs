using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using AdminApp.Components;
using AdminApp.Components.Account;
using AdminApp.Data;
using ClosedXML.Excel;

namespace AdminApp;

public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Razor / Blazor
        builder.Services.AddRazorComponents()
            .AddInteractiveServerComponents();

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

        // Admin role 기반 인가 정책
        builder.Services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
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

        app.MapRazorComponents<App>()
            .AddInteractiveServerRenderMode();

        app.MapAdditionalIdentityEndpoints();

        // 공지 첨부파일 다운로드 (로그인 필요)
        app.MapGet("/notices/attachments/{id:int}", async (int id, IDbContextFactory<ApplicationDbContext> dbFactory) =>
        {
            await using var db = await dbFactory.CreateDbContextAsync();
            var att = await db.NoticeAttachments.FindAsync(id);
            if (att == null) return Results.NotFound();
            return Results.File(att.Content, att.ContentType ?? "application/octet-stream", att.FileName);
        }).RequireAuthorization();

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

        app.Run();
    }
}
