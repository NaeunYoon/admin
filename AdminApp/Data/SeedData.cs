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

    private const string AdminEmail = "admin@admin.com";
    private const string AdminPassword = "Admin1020!";

    public static async Task InitializeAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();

        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        // Role 생성
        foreach (var role in new[] { AdminRole, EmployeeRole })
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
    }
}
