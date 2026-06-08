namespace AdminApp.Data;

/// <summary>
/// 사용자별 알림함 항목. 푸시 발송 시 함께 저장 → 사용자가 앱 안에서 모아 볼 수 있음.
/// </summary>
public class NotificationItem
{
    public int Id { get; set; }

    /// <summary>받는 사용자 ID</summary>
    public string UserId { get; set; } = "";

    public string Title { get; set; } = "";

    public string Body { get; set; } = "";

    /// <summary>클릭 시 이동할 URL</summary>
    public string? Url { get; set; }

    /// <summary>분류 (휴가 / 포상 / 비품 / 공지 / 버그 / 기타)</summary>
    public string? Category { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}
