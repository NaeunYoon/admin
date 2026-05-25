using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace AdminApp.Data;

/// <summary>
/// 로그인 시 KoreanName, EmployeeNumber 등 추가 클레임을 ClaimsPrincipal에 주입.
/// → NavMenu, 페이지에서 @context.User.FindFirst("KoreanName")?.Value 로 사용 가능
/// </summary>
public class AdditionalUserClaimsPrincipalFactory
    : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole>
{
    public AdditionalUserClaimsPrincipalFactory(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IOptions<IdentityOptions> optionsAccessor)
        : base(userManager, roleManager, optionsAccessor)
    {
    }

    public override async Task<ClaimsPrincipal> CreateAsync(ApplicationUser user)
    {
        var principal = await base.CreateAsync(user);
        if (principal.Identity is ClaimsIdentity identity)
        {
            if (!string.IsNullOrEmpty(user.KoreanName))
                identity.AddClaim(new Claim("KoreanName", user.KoreanName));
            if (!string.IsNullOrEmpty(user.EmployeeNumber))
                identity.AddClaim(new Claim("EmployeeNumber", user.EmployeeNumber));
        }
        return principal;
    }
}
