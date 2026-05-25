namespace AdminApp.Data;

/// <summary>휴가 상신 (연차/반차/병가/포상휴가 사용 신청)</summary>
public class LeaveRequest
{
    public int Id { get; set; }

    public string UserId { get; set; } = "";
    public string? UserName { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    /// <summary>연차 / 반차 / 병가 / 포상휴가</summary>
    public string LeaveType { get; set; } = "연차";

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
