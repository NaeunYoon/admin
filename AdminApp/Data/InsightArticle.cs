using System.ComponentModel.DataAnnotations.Schema;

namespace AdminApp.Data;

/// <summary>
/// 개별 에듀테크 뉴스 기사. Brave Search로 자동 수집됨.
/// 아카이브 표 + 홈 핵심 뉴스 리스트에 사용.
/// </summary>
public class InsightArticle
{
    public int Id { get; set; }

    /// <summary>이 기사가 어느 일일 브리핑의 핵심 뉴스로 선정됐는지 (null이면 아카이브에만)</summary>
    public int? BriefingId { get; set; }

    /// <summary>제목</summary>
    public string Title { get; set; } = "";

    /// <summary>원문 URL (고유)</summary>
    public string Url { get; set; } = "";

    /// <summary>출처 (예: TechCrunch, 이투데이)</summary>
    public string? Source { get; set; }

    /// <summary>기사 게재일</summary>
    public DateOnly? PublishedDate { get; set; }

    /// <summary>한 줄 요약 (Brave 스니펫 or 사람이 편집)</summary>
    public string? OneLineSummary { get; set; }

    /// <summary>핵심 키워드 (CSV)</summary>
    public string? Keywords { get; set; }

    /// <summary>본문/상세 요약 (있으면 표시, 없으면 원문 링크만)</summary>
    public string? FullContent { get; set; }

    /// <summary>일일 브리핑 내 위치 (0=피처 안 됨, 1/2/3=핵심 뉴스 1/2/3번)</summary>
    public int FeaturedOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [NotMapped]
    public IEnumerable<string> KeywordList =>
        (Keywords ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
