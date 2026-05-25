namespace AdminApp.Helpers;

/// <summary>
/// 주민등록번호 파싱 유틸 — 생년월일, 성별 추출, 임시 비밀번호 생성
/// </summary>
public static class ResidentNumberHelper
{
    /// <summary>
    /// 주민번호에서 생년월일과 성별 추출
    /// 7번째 자리:
    ///   1,2 → 1900년대 (남/여)
    ///   3,4 → 2000년대 (남/여)
    ///   5,6 → 1900년대 외국인 (남/여)
    ///   7,8 → 2000년대 외국인 (남/여)
    ///   9,0 → 1800년대 (남/여)
    /// </summary>
    public static (DateOnly? BirthDate, string? Gender) Parse(string? rrn)
    {
        if (string.IsNullOrWhiteSpace(rrn)) return (null, null);
        var digits = new string(rrn.Where(char.IsDigit).ToArray());
        if (digits.Length < 7) return (null, null);

        if (!int.TryParse(digits[..2], out var yy)) return (null, null);
        if (!int.TryParse(digits.Substring(2, 2), out var mm)) return (null, null);
        if (!int.TryParse(digits.Substring(4, 2), out var dd)) return (null, null);

        var g = digits[6];
        int century = g switch
        {
            '1' or '2' or '5' or '6' => 1900,
            '3' or '4' or '7' or '8' => 2000,
            '9' or '0' => 1800,
            _ => -1
        };
        if (century < 0) return (null, null);

        var gender = (g - '0') % 2 == 1 ? "남" : "여";

        try
        {
            var birth = new DateOnly(century + yy, mm, dd);
            return (birth, gender);
        }
        catch
        {
            return (null, null);
        }
    }

    /// <summary>주민번호 앞 6자리 추출 (임시 비밀번호용)</summary>
    public static string ExtractTempPassword(string? rrn)
    {
        if (string.IsNullOrWhiteSpace(rrn)) return "";
        var digits = new string(rrn.Where(char.IsDigit).ToArray());
        return digits.Length >= 6 ? digits[..6] : digits;
    }
}
