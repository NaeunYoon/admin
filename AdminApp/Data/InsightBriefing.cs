using System.ComponentModel.DataAnnotations.Schema;

namespace AdminApp.Data;

/// <summary>
/// 일일 에듀테크 동향 브리핑 (홈 위젯에 표시). 매일 1개씩 생성됨.
/// </summary>
public class InsightBriefing
{
    public int Id { get; set; }

    /// <summary>브리핑 날짜 (= 발행일, 고유)</summary>
    public DateOnly BriefingDate { get; set; }

    /// <summary>3줄 요약 (개행으로 구분된 불릿 3개)</summary>
    public string Summary { get; set; } = "";

    /// <summary>출처 표기 (예: "Brave Search 실시간 검색 기반")</summary>
    public string? SourceNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [NotMapped]
    public IEnumerable<string> SummaryLines =>
        (Summary ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
