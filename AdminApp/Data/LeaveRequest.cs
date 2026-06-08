namespace AdminApp.Data;

/// <summary>휴가 상신 (연차/반차/병가/포상휴가 사용 신청)</summary>
public class LeaveRequest
{
    public int Id { get; set; }

    public string UserId { get; set; } = "";
    public string? UserName { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    /// <summary>연차 / 반차 / 반반차 / 병가 / 포상휴가</summary>
    public string LeaveType { get; set; } = "연차";

    /// <summary>
    /// 반차/반반차 시간대 구분.
    /// 반차: "오전" / "오후"
    /// 반반차: "1교시"(오전 전반) / "2교시"(오전 후반) / "3교시"(오후 전반) / "4교시"(오후 후반)
    /// 종일(연차/병가/포상): null
    /// </summary>
    public string? Period { get; set; }

    public string Reason { get; set; } = "개인사유";

    /// <summary>차감 일수</summary>
    public decimal Days { get; set; }

    /// <summary>대기 / 승인 / 반려</summary>
    public string Status { get; set; } = "대기";

    public string? ApprovedById { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
