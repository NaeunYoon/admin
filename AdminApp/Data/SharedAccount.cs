namespace AdminApp.Data;

/// <summary>
/// 회사에서 공용으로 사용하는 프로그램/서비스의 계정 (예: ChatGPT, Adobe, Figma 등)
/// </summary>
public class SharedAccount
{
    public int Id { get; set; }

    /// <summary>프로그램/서비스명</summary>
    public string ProgramName { get; set; } = "";

    /// <summary>용도/구분 (예: 개발팀 공용, 마케팅용)</summary>
    public string? Purpose { get; set; }

    /// <summary>로그인 ID</summary>
    public string? LoginId { get; set; }

    /// <summary>비밀번호 (사내 공용 — 평문 저장)</summary>
    public string? Password { get; set; }

    /// <summary>접속 URL</summary>
    public string? Url { get; set; }

    /// <summary>메모</summary>
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
