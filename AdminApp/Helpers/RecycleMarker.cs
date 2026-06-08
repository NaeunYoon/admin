namespace AdminApp.Helpers;

/// <summary>
/// 공지 제목/본문에 들어가는 분리배출 도우미 마커 처리.
/// 마커가 있으면 도우미 버튼을 표시하고, 화면에서는 마커 글자를 제거한다.
/// </summary>
public static class RecycleMarker
{
    public static readonly string[] Markers = { "[[분리배출]]", "[[recycle]]", "[[재활용]]" };

    public static bool Has(string? text) =>
        !string.IsNullOrEmpty(text) && Markers.Any(m => text.Contains(m));

    public static string Strip(string? text)
    {
        var s = text ?? "";
        foreach (var m in Markers) s = s.Replace(m, "");
        return s.Trim();
    }
}
