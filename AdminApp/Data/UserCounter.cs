namespace AdminApp.Data;

/// <summary>
/// 테스트용 사용자별 카운터 — 서버 영속화 데모.
/// 버튼 클릭 시 +1 후 DB 저장, 페이지 로딩 시 DB에서 로드.
/// </summary>
public class UserCounter
{
    public int Id { get; set; }

    /// <summary>사용자 Id (1인 1행)</summary>
    public string UserId { get; set; } = "";

    public int Count { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
