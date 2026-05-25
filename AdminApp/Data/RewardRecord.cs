namespace AdminApp.Data;

/// <summary>
/// 포상 내역 (포상휴가 부여).
/// - 직원이 추가근무 기반으로 상신 (WorkHours × 1.2)
/// - 또는 관리자가 임의 부여
/// 승인 시 해당 직원의 RewardLeave(포상휴가 총량)에 가산됨.
/// </summary>
public class RewardRecord
{
    public int Id { get; set; }

    public string UserId { get; set; } = "";
    public string? UserName { get; set; }

    /// <summary>포상 일수</summary>
    public decimal Amount { get; set; }

    /// <summary>추가근무 시간 (계산 근거, 직원 상신 시)</summary>
    public decimal? WorkHours { get; set; }

    public string Reason { get; set; } = "";

    /// <summary>직원상신 / 관리자부여</summary>
    public string Source { get; set; } = "직원상신";

    /// <summary>대기 / 승인 / 반려</summary>
    public string Status { get; set; } = "대기";

    public string? ApprovedById { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
