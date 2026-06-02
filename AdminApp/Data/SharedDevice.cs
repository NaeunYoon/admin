namespace AdminApp.Data;

/// <summary>
/// 회사 공용 기기 (예: 회의실 빔, 공용 노트북, 카메라 등)
/// </summary>
public class SharedDevice
{
    public int Id { get; set; }

    /// <summary>기기명</summary>
    public string Name { get; set; } = "";

    /// <summary>분류 (노트북/모니터/프린터/빔/카메라/태블릿 등)</summary>
    public string? Category { get; set; }

    /// <summary>사양 (예: i7-12700, 16GB RAM, 512GB SSD)</summary>
    public string? Specs { get; set; }

    /// <summary>보관 위치</summary>
    public string? Location { get; set; }

    /// <summary>시리얼/관리번호</summary>
    public string? SerialNumber { get; set; }

    /// <summary>상태 (사용중/유휴/수리/폐기)</summary>
    public string? Status { get; set; } = "유휴";

    /// <summary>메모</summary>
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
