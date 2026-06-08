namespace AdminApp.Data;

/// <summary>
/// 사내 문서함 항목 (입사·퇴사·휴가·연말정산 등 양식 문서).
/// 공지사항처럼 간단한 설명 + 첨부파일.
/// </summary>
public class CompanyDocument
{
    public int Id { get; set; }

    /// <summary>분류 (입사 / 퇴사 / 휴가 / 연말정산 / 기타)</summary>
    public string Category { get; set; } = "기타";

    public string Title { get; set; } = "";

    public string? Description { get; set; }

    public string? AuthorId { get; set; }
    public string? AuthorName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
