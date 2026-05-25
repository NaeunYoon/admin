namespace AdminApp.Data;

/// <summary>비품 / 간식 요청</summary>
public class SupplyRequest
{
    public int Id { get; set; }

    public string UserId { get; set; } = "";
    public string? UserName { get; set; }

    /// <summary>비품 / 간식</summary>
    public string Category { get; set; } = "비품";

    public string ItemName { get; set; } = "";

    public int Quantity { get; set; } = 1;

    public string? Note { get; set; }

    /// <summary>대기 / 승인 / 완료 / 반려</summary>
    public string Status { get; set; } = "대기";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
