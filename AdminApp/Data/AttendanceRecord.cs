using System.ComponentModel.DataAnnotations.Schema;

namespace AdminApp.Data;

/// <summary>일별 근태 기록 (출근/퇴근 1행 = 1일)</summary>
public class AttendanceRecord
{
    public int Id { get; set; }

    /// <summary>매칭된 직원 Id (사번으로 매칭, 미매칭 시 null)</summary>
    public string? UserId { get; set; }

    /// <summary>단말기 사원번호 = 사번</summary>
    public string EmployeeNumber { get; set; } = "";

    /// <summary>근무 일자</summary>
    public DateOnly WorkDate { get; set; }

    /// <summary>출근 시각 (첫 지문)</summary>
    public TimeOnly? CheckIn { get; set; }

    /// <summary>퇴근 시각 (마지막 지문)</summary>
    public TimeOnly? CheckOut { get; set; }

    /// <summary>수집 출처: 수동 / CSV / API</summary>
    public string Source { get; set; } = "수동";

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>근무 시간(분) = 퇴근 - 출근</summary>
    [NotMapped]
    public int? WorkMinutes =>
        (CheckIn.HasValue && CheckOut.HasValue && CheckOut.Value > CheckIn.Value)
            ? (int)(CheckOut.Value - CheckIn.Value).TotalMinutes
            : null;

    /// <summary>근무 시간 표시 (예: 9h 05m)</summary>
    [NotMapped]
    public string WorkDisplay =>
        WorkMinutes is int m ? $"{m / 60}h {m % 60:00}m" : "-";
}
