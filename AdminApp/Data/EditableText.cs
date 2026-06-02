namespace AdminApp.Data;

/// <summary>
/// 관리자가 편집 가능한 화면 텍스트 (페이지 제목, 소제목 등).
/// Key 기반으로 코드에서 참조하고, 값은 DB에 저장 + 메모리에 캐시.
/// </summary>
public class EditableText
{
    public int Id { get; set; }

    /// <summary>식별 키 (예: "home.notices.title")</summary>
    public string Key { get; set; } = "";

    /// <summary>현재 값 (관리자가 편집)</summary>
    public string Value { get; set; } = "";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
