namespace AdminApp.Data;

/// <summary>
/// 사용자가 신고한 버그/이슈. 직원·게스트·관리자 모두 작성/조회.
/// 상태 변경은 관리자만.
/// </summary>
public class BugReport
{
    public int Id { get; set; }

    public string Title { get; set; } = "";

    /// <summary>증상/상황 설명</summary>
    public string Description { get; set; } = "";

    /// <summary>발생 페이지 URL / 위치 (선택)</summary>
    public string? PageUrl { get; set; }

    /// <summary>심각도: 낮음 / 보통 / 높음 / 심각</summary>
    public string Severity { get; set; } = "보통";

    /// <summary>상태: 접수 / 확인중 / 처리중 / 해결 / 보류</summary>
    public string Status { get; set; } = "접수";

    public string? ReporterUserId { get; set; }
    public string? ReporterName { get; set; }

    /// <summary>관리자 메모 / 처리 노트</summary>
    public string? AdminNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
