namespace AdminApp.Data;

/// <summary>사내 행사 / 일정 (회식, 창립기념일 등)</summary>
public class CompanyEvent
{
    public int Id { get; set; }

    public DateOnly Date { get; set; }

    public string Title { get; set; } = "";

    public string? Description { get; set; }

    /// <summary>회식 / 기념일 / 행사 / 기타</summary>
    public string Category { get; set; } = "행사";

    public string? CreatedById { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
