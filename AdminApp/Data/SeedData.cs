using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AdminApp.Data;

/// <summary>
/// 앱 시작 시 자동 실행 — DB 마이그레이션, Admin 역할 생성, 초기 관리자 계정 생성
/// </summary>
public static class SeedData
{
    public const string AdminRole = "Admin";
    public const string EmployeeRole = "Employee";
    public const string GuestRole = "Guest";

    private const string AdminEmail = "admin@admin.com";
    private const string AdminPassword = "Admin1020!";

    public static async Task InitializeAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();

        // 편집 가능 텍스트 캐시를 미리 로드 (이후 페이지가 즉시 사용)
        var textSvc = services.GetService<AdminApp.Services.EditableTextService>();
        if (textSvc != null) await textSvc.EnsureLoadedAsync();

        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        // Role 생성
        foreach (var role in new[] { AdminRole, EmployeeRole, GuestRole })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        // 초기 Admin 계정 생성
        var admin = await userManager.FindByEmailAsync(AdminEmail);
        if (admin == null)
        {
            admin = new ApplicationUser
            {
                UserName = AdminEmail,
                Email = AdminEmail,
                EmailConfirmed = true,
                KoreanName = "관리자",
                Position = "시스템 관리자",
                Department = "전체",
                HireDate = DateOnly.FromDateTime(DateTime.Today),
                TotalAnnualLeave = 0
            };
            var result = await userManager.CreateAsync(admin, AdminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, AdminRole);
            }
        }
        else if (!await userManager.IsInRoleAsync(admin, AdminRole))
        {
            await userManager.AddToRoleAsync(admin, AdminRole);
        }

        // 기존 가입자들에게 Employee 역할 부여 (역할 없는 사람만)
        var allUsers = await db.Users.ToListAsync();
        foreach (var user in allUsers)
        {
            var roles = await userManager.GetRolesAsync(user);
            if (roles.Count == 0)
            {
                await userManager.AddToRoleAsync(user, EmployeeRole);
            }
        }

        // 샘플 공지사항 (공지가 하나도 없을 때만)
        if (!await db.Notices.AnyAsync())
        {
            db.Notices.AddRange(SampleNotices(admin));
            await db.SaveChangesAsync();
        }
    }

    private static IEnumerable<Notice> SampleNotices(ApplicationUser? author)
    {
        var now = DateTime.UtcNow;
        var name = author?.KoreanName ?? "관리자";
        var id = author?.Id;

        Notice N(string title, string content, bool pinned, int minutesAgo) => new()
        {
            Title = title,
            Content = content,
            AuthorId = id,
            AuthorName = name,
            IsPinned = pinned,
            CreatedAt = now.AddMinutes(-minutesAgo),
            UpdatedAt = now.AddMinutes(-minutesAgo)
        };

        yield return N("[필독] 휴가 규정 안내", VacationPolicy, true, 40);
        yield return N("야근 및 철야 보상 정책", OvertimePolicy, true, 30);
        yield return N("비품 / 경비 처리 안내", ExpensePolicy, false, 20);
        yield return N("간식 신청 가이드", SnackGuide, false, 10);
    }

    private const string VacationPolicy = """
[기본 원칙]
- 모든 휴가는 사내 대시보드의 연차신청 폼을 통해 신청해야 합니다.

[휴가 종류 및 차감]
- 연차: 1일 전체 휴무 (1.0일 차감)
- 반차: 0.5일 차감
  · 8출(08:00~17:00): 오전(08:00~12:00) 또는 오후(12:00~17:00)
  · 9출(09:00~18:00): 오전(09:00~13:00) 또는 오후(13:00~18:00)
  · 10출(10:00~19:00): 오전(10:00~15:00) 또는 오후(15:00~19:00)
- 반반차: 2시간 단위 휴무 (0.25일 차감)
- 병가: 질병이나 부상으로 인한 휴무 (무급 휴가)

[승인 절차]
- 신청서 제출 ➔ 관리자 확인 ➔ [승인완료] 상태 변경 시 최종 확정됩니다.
""";

    private const string OvertimePolicy = """
[목표]
- 행정 간소화 및 보상 관련 분쟁 최소화
- 회사가 감당 가능한 수준 내에서 형평성에 맞는 합리적 보상 제공 (250624 원칙)

1. 별도업무 개요
- 야근: 정규 퇴근 시간 이후 연장 근무
- 철야: 심야 시간을 포함한 철야 근무
- 대체 업무: 휴일 및 주말 근무 등

2. 인정 기준 및 절차
- 원칙: 사전 신청 및 부서장 사전 승인 필수
- 예외: 긴급 업무의 경우 사후 승인 인정
- 신청 채널: 카카오톡(또는 지정된 사내 메신저/폼)
- 최소 시간: 최소 60분 이상 근무 시 인정 (이후 분 단위 정밀 계산)
- 식사 시간: 외부 식사 시간은 근무에서 제외, 포장은 최대 10분 허용(카톡 보고)
- 야근 식대: 21시 초과 시 1인 최대 9,000원, 법인카드 사용

3. 보상 산정
- 산정 공식: 실제 근무시간(분) × 1.2 (모든 별도업무 1.2배 일괄 적용)
- 대체휴가: 누적 8시간 도달 시 1일 부여
- 정산 주기: 매달 귀속 급여일 기준
- 시간 이월: 8시간 미달 잔여시간은 다음 달로 누적 이월
- 휴가 이월: 대체휴가는 만기 없음, 차년도 이월 가능
- 보수 전환: 향후 정책 논의에 따라 수당 전환 가능

4. 신청 양식 (카카오톡)
[사전] 업무 사유 / 긴급도(상중하) / 예상 퇴근시간 / 예상 식사시간
[사후] 실제 근무시간(예 19:00~22:30, 3시간30분) / 업무 진행사항
""";

    private const string ExpensePolicy = """
[사무 비품 구매]
- 소모품(포스트잇, 필기구 등)은 사내 비품함에서 자유롭게 사용 가능합니다.
- 키보드, 마우스, 모니터 등 고가 장비는 별도 품의 후 구매합니다.

[경비 처리 방법]
- 모든 경비 지출 시 '종이 영수증' 또는 '전자 영수증'을 반드시 지참해야 합니다.
- 법인카드 사용: 영수증 뒷면에 '사용 목적/참석자' 기재 후 관리자 제출
- 개인카드 사용: 매월 말일까지 영수증을 모아 경비 청구서 작성 후 제출
""";

    private const string SnackGuide = """
[간식 신청 안내]
- 신청 기한: 매주 금요일 오후 4시까지 (월요일 일괄 배송)
- 신청 방법: 홈 화면 하단 [비품/간식 요청] 버튼 클릭 후 작성
- 적정 금액: 인당 월 20,000원 ~ 30,000원 수준으로 편성
- 필수 사항: 원활한 주문을 위해 쿠팡 등 구매 링크를 반드시 첨부해 주세요!
- 주의 사항: 인당 월 예산 범위 내에서 신청 가능하며, 고가 상품은 반려될 수 있습니다.
""";
}
