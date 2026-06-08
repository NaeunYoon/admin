namespace AdminApp.Data;

/// <summary>
/// 웹 푸시 구독 정보. 사용자 한 명이 여러 기기에서 구독 가능 (UserId+Endpoint 조합).
/// </summary>
public class PushSubscriptionEntry
{
    public int Id { get; set; }

    /// <summary>구독한 사용자 ID</summary>
    public string UserId { get; set; } = "";

    /// <summary>푸시 서비스 엔드포인트 URL (브라우저 → 푸시 서버)</summary>
    public string Endpoint { get; set; } = "";

    /// <summary>p256dh 공개키 (Base64URL)</summary>
    public string P256dh { get; set; } = "";

    /// <summary>auth 시크릿 (Base64URL)</summary>
    public string Auth { get; set; } = "";

    /// <summary>등록한 기기/브라우저 (디버깅용)</summary>
    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
