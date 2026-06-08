using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace AdminApp.Data;

/// <summary>
/// 사원 정보 + Identity 통합 사용자 모델
/// </summary>
public class ApplicationUser : IdentityUser
{
    // ============================================================
    // 기본 정보
    // ============================================================

    /// <summary>사번</summary>
    public string? EmployeeNumber { get; set; }

    /// <summary>한글 이름</summary>
    public string? KoreanName { get; set; }

    /// <summary>영문 이름</summary>
    public string? EnglishName { get; set; }

    /// <summary>생년월일</summary>
    public DateOnly? BirthDate { get; set; }

    /// <summary>성별 (남/여/기타)</summary>
    public string? Gender { get; set; }

    /// <summary>주민등록번호 (민감 — 실제 운영 시 암호화 권장)</summary>
    public string? ResidentRegistrationNumber { get; set; }

    // ============================================================
    // 연락처
    // ============================================================

    /// <summary>우편번호</summary>
    public string? PostalCode { get; set; }

    /// <summary>주소</summary>
    public string? Address { get; set; }

    /// <summary>상세 주소</summary>
    public string? AddressDetail { get; set; }

    /// <summary>비상 연락처</summary>
    public string? EmergencyContact { get; set; }

    /// <summary>비상 연락처 관계</summary>
    public string? EmergencyContactRelation { get; set; }

    // ============================================================
    // 학력
    // ============================================================

    /// <summary>최종학력 (고졸/대졸/석사/박사)</summary>
    public string? LastEducation { get; set; }

    /// <summary>최종 학교명</summary>
    public string? LastSchool { get; set; }

    /// <summary>전공</summary>
    public string? Major { get; set; }

    // ============================================================
    // 고용 정보
    // ============================================================

    /// <summary>입사일</summary>
    public DateOnly? HireDate { get; set; }

    /// <summary>퇴사일 (재직 중이면 null)</summary>
    public DateOnly? ResignationDate { get; set; }

    /// <summary>부서</summary>
    public string? Department { get; set; }

    /// <summary>직무</summary>
    public string? Position { get; set; }

    /// <summary>직급 (사원/대리/과장/차장/부장)</summary>
    public string? Rank { get; set; }

    /// <summary>고용 형태 (정규직/계약직/인턴/파트타임)</summary>
    public string? EmploymentType { get; set; }

    /// <summary>근무지 (본사/지사/재택 등)</summary>
    public string? WorkLocation { get; set; }

    /// <summary>출근 예정 시각 (지각 판정 기준, 미설정 시 09:00)</summary>
    public TimeOnly? ScheduledStartTime { get; set; }

    // ============================================================
    // 휴가
    // ============================================================

    /// <summary>총 연차 (연 단위 부여량)</summary>
    public decimal TotalAnnualLeave { get; set; } = 15m;

    /// <summary>사용한 연차</summary>
    public decimal UsedAnnualLeave { get; set; }

    /// <summary>포상휴가 부여량</summary>
    public decimal RewardLeave { get; set; }

    /// <summary>사용한 포상휴가</summary>
    public decimal UsedRewardLeave { get; set; }

    /// <summary>병가 총량</summary>
    public decimal SickLeaveTotal { get; set; }

    /// <summary>사용한 병가</summary>
    public decimal SickLeaveUsed { get; set; }

    // ============================================================
    // 급여 / 계좌 (민감)
    // ============================================================

    /// <summary>연봉</summary>
    public decimal? Salary { get; set; }

    /// <summary>은행명</summary>
    public string? BankName { get; set; }

    /// <summary>계좌번호</summary>
    public string? BankAccount { get; set; }

    /// <summary>예금주</summary>
    public string? AccountHolder { get; set; }

    // ============================================================
    // 기타
    // ============================================================

    /// <summary>프로필 사진 URL</summary>
    public string? ProfilePhotoUrl { get; set; }

    /// <summary>인사관리용 메모</summary>
    public string? Notes { get; set; }

    /// <summary>알림 받기 (앱+푸시) — false면 알림 자체를 받지 않음</summary>
    public bool NotificationsEnabled { get; set; } = true;

    /// <summary>생성일자</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>수정일자</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ============================================================
    // 계산 속성 (DB 비저장)
    // ============================================================

    /// <summary>만 나이</summary>
    [NotMapped]
    public int? Age => BirthDate.HasValue ? CalculateAge(BirthDate.Value) : null;

    /// <summary>입사 년차 (만)</summary>
    [NotMapped]
    public int? YearsOfService => HireDate.HasValue ? CalculateYears(HireDate.Value) : null;

    /// <summary>남은 연차</summary>
    [NotMapped]
    public decimal RemainingAnnualLeave => TotalAnnualLeave - UsedAnnualLeave;

    /// <summary>남은 포상휴가</summary>
    [NotMapped]
    public decimal RemainingRewardLeave => RewardLeave - UsedRewardLeave;

    /// <summary>남은 병가</summary>
    [NotMapped]
    public decimal RemainingSickLeave => SickLeaveTotal - SickLeaveUsed;

    /// <summary>재직 여부</summary>
    [NotMapped]
    public bool IsActive => ResignationDate == null;

    /// <summary>근로기준법상 법정 연차 (입사일 기반 자동 계산)</summary>
    [NotMapped]
    public decimal StatutoryAnnualLeave => HireDate.HasValue
        ? CalculateStatutoryAnnualLeave(HireDate.Value)
        : 0m;

    /// <summary>주민등록번호 마스킹 표시 (예: 940220-2******)</summary>
    [NotMapped]
    public string? MaskedResidentNumber => string.IsNullOrEmpty(ResidentRegistrationNumber)
        ? null
        : ResidentRegistrationNumber.Length >= 8
            ? ResidentRegistrationNumber[..8] + "******"
            : ResidentRegistrationNumber;

    /// <summary>
    /// 근로기준법 제60조 기반 입사 후 누적 발생 연차 (사원 보유 총 연차)
    /// - 1년 미만: 매월 1일씩 발생 (최대 11일)
    /// - 만 1년~: 11일(1년차 발생분) + 매 1년 만기 시 그 다음 1년치 연차 누적
    ///   · 1년 만기 후: 15, 2년 만기 후: 15, 3년 만기 후: 16, 5년 만기 후: 17 ... 최대 25
    /// - 예: 윤나은(2023.5.8 입사 → 2026.6.2 기준 만 3년):
    ///   11(1년차) + 15(2년차) + 15(3년차) + 16(4년차) = 57일
    /// </summary>
    public static decimal CalculateStatutoryAnnualLeave(DateOnly hireDate)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        if (today < hireDate) return 0;

        var years = CalculateYears(hireDate);

        // 1년 미만: 매월 1일씩 (최대 11)
        if (years < 1)
        {
            var months = ((today.Year - hireDate.Year) * 12) + (today.Month - hireDate.Month);
            if (today.Day < hireDate.Day) months--;
            return Math.Min(Math.Max(months, 0), 11);
        }

        // 1년 이상: 1년차 발생분 11 + 매 만기 누적
        decimal total = 11m;
        for (int y = 1; y <= years; y++)
        {
            // y년 만기 시 지급되는 연차(=다음 1년 사용분)
            // 만 1년~2년: 15, 만 3년~4년: 16, 만 5년~6년: 17 ... 최대 25
            decimal grant = Math.Min(15 + Math.Max(0, (y - 1) / 2), 25);
            total += grant;
        }
        return total;
    }

    private static int CalculateAge(DateOnly birthDate)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var age = today.Year - birthDate.Year;
        if (today < birthDate.AddYears(age)) age--;
        return age;
    }

    private static int CalculateYears(DateOnly hireDate)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var years = today.Year - hireDate.Year;
        if (today < hireDate.AddYears(years)) years--;
        return years;
    }
}
