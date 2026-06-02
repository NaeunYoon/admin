namespace AdminApp.Data;

/// <summary>
/// 매주 반복되는 고정 회의. 관리자가 설정하면 회의실 예약 그리드에 매주 자동 표시됨.
/// </summary>
public class RecurringMeeting
{
    public int Id { get; set; }

    /// <summary>요일 (Monday=1 ~ Friday=5만 사용)</summary>
    public DayOfWeek DayOfWeek { get; set; }

    /// <summary>시작 시각 (정시)</summary>
    public TimeOnly StartTime { get; set; }

    /// <summary>종료 시각 (정시)</summary>
    public TimeOnly EndTime { get; set; }

    public string Title { get; set; } = "";
    public string Color { get; set; } = "#6366f1"; // 정기 회의 기본 색 (보라)
    public string? Notes { get; set; }

    /// <summary>일시 비활성화 (휴지 등). false면 그리드에 표시 안 됨.</summary>
    public bool IsActive { get; set; } = true;

    public string? CreatedById { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
