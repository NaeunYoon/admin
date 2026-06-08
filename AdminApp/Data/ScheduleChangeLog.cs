namespace AdminApp.Data;

/// <summary>
/// 근무시간 변경 이력. 누가 언제 어느 날짜를 어떻게 바꿨는지 기록.
/// </summary>
public class ScheduleChangeLog
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string? UserName { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly? OldStart { get; set; }
    public TimeOnly? OldEnd { get; set; }
    public TimeOnly NewStart { get; set; }
    public TimeOnly NewEnd { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}
