namespace AdminApp.Data;

/// <summary>
/// 관리자가 이미 승인한 신청(휴가/포상/비품)을 취소한 내역.
/// 잔여 연차/포상 복원 후 감사 추적용으로 기록.
/// </summary>
public class ApprovalRevertLog
{
    public int Id { get; set; }

    /// <summary>"Leave" | "Reward" | "Supply"</summary>
    public string RequestType { get; set; } = "";

    /// <summary>원본 신청 ID (LeaveRequest/RewardRecord/SupplyRequest)</summary>
    public int RequestId { get; set; }

    /// <summary>대상 직원</summary>
    public string? UserId { get; set; }
    public string? UserName { get; set; }

    /// <summary>휴가 종류 또는 신청 분류 (연차/포상휴가/비품 등)</summary>
    public string? Category { get; set; }

    /// <summary>복원된 일수/수량 (휴가/포상). 비품은 null.</summary>
    public decimal? Amount { get; set; }

    /// <summary>취소 전 상태 (승인/완료)</summary>
    public string? OriginalStatus { get; set; }

    /// <summary>취소 사유 (관리자 입력)</summary>
    public string? Reason { get; set; }

    /// <summary>요약 (목록에 한 줄로 표시)</summary>
    public string? Summary { get; set; }

    /// <summary>취소를 처리한 관리자</summary>
    public string? RevertedById { get; set; }
    public string? RevertedByName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
