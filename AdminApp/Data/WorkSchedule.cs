namespace AdminApp.Data;

/// <summary>
/// 직원별 특정 날짜의 유연 근무 계획 (출근/퇴근 시각).
/// 당일 자정 이후에는 변경 불가(계획적 운영).
/// </summary>
public class WorkSchedule
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }   // 08:00 / 09:00 / 10:00
    public TimeOnly EndTime { get; set; }     // 17:00 / 18:00 / 19:00
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
