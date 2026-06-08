namespace AdminApp.Data;

/// <summary>
/// 역할(권한)별 페이지 방문 횟수 집계. 방문 시마다 +1.
/// </summary>
public class PageStat
{
    public int Id { get; set; }
    public string Role { get; set; } = "";     // Admin / Employee / Guest
    public string Page { get; set; } = "";     // 페이지 표시 이름
    public int Count { get; set; }
    public DateTime LastVisitUtc { get; set; } = DateTime.UtcNow;
}
