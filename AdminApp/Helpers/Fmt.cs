namespace AdminApp.Helpers;

/// <summary>표시용 포맷 헬퍼</summary>
public static class Fmt
{
    /// <summary>소수점 둘째 자리까지 (불필요한 0 제거). 예: 18.939999 → 18.94, 15 → 15, 0.5 → 0.5</summary>
    public static string Day(decimal v) =>
        Math.Round(v, 2, MidpointRounding.AwayFromZero).ToString("0.##");

    public static string Day(decimal? v) => v.HasValue ? Day(v.Value) : "-";
}
