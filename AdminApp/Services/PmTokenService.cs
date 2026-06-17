using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace AdminApp.Services;

/// <summary>
/// 프로젝트 관리(SCON_PJ) SSO용 HS256 JWT를 외부 의존성 없이 발급한다.
/// Express(jsonwebtoken)가 동일한 공유 시크릿으로 검증한다.
/// </summary>
public static class PmTokenService
{
    public static string Mint(string secret, IDictionary<string, object> claims, TimeSpan ttl)
    {
        var now = DateTimeOffset.UtcNow;
        var payload = new Dictionary<string, object>(claims)
        {
            ["iat"] = now.ToUnixTimeSeconds(),
            ["exp"] = now.Add(ttl).ToUnixTimeSeconds(),
        };

        string header  = B64Url(JsonSerializer.SerializeToUtf8Bytes(new { alg = "HS256", typ = "JWT" }));
        string body    = B64Url(JsonSerializer.SerializeToUtf8Bytes(payload));
        string signing = $"{header}.{body}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var sig = hmac.ComputeHash(Encoding.ASCII.GetBytes(signing));
        return $"{signing}.{B64Url(sig)}";
    }

    private static string B64Url(byte[] data) =>
        Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
