namespace AdminApp.Data;

/// <summary>
/// 회의실 예약. 평일 8시-19시 사이 1시간 단위 예약.
/// </summary>
public class RoomReservation
{
    public int Id { get; set; }

    /// <summary>예약 날짜 (KST 기준 평일)</summary>
    public DateOnly Date { get; set; }

    /// <summary>시작 시각 (정시)</summary>
    public TimeOnly StartTime { get; set; }

    /// <summary>종료 시각 (정시)</summary>
    public TimeOnly EndTime { get; set; }

    /// <summary>회의명 (예: 마케팅 정기 회의)</summary>
    public string Title { get; set; } = "";

    /// <summary>색상 (hex)</summary>
    public string Color { get; set; } = "#3b82f6";

    /// <summary>메모</summary>
    public string? Notes { get; set; }

    public string? CreatedById { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
