using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AdminApp.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Notice> Notices => Set<Notice>();
    public DbSet<NoticeAttachment> NoticeAttachments => Set<NoticeAttachment>();
    public DbSet<UserCounter> UserCounters => Set<UserCounter>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<RewardRecord> RewardRecords => Set<RewardRecord>();
    public DbSet<SupplyRequest> SupplyRequests => Set<SupplyRequest>();
    public DbSet<CompanyEvent> CompanyEvents => Set<CompanyEvent>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<SharedAccount> SharedAccounts => Set<SharedAccount>();
    public DbSet<SharedDevice> SharedDevices => Set<SharedDevice>();
    public DbSet<InsightBriefing> InsightBriefings => Set<InsightBriefing>();
    public DbSet<InsightArticle> InsightArticles => Set<InsightArticle>();
    public DbSet<RoomReservation> RoomReservations => Set<RoomReservation>();
    public DbSet<ApprovalRevertLog> ApprovalRevertLogs => Set<ApprovalRevertLog>();
    public DbSet<BugReport> BugReports => Set<BugReport>();
    public DbSet<RecurringMeeting> RecurringMeetings => Set<RecurringMeeting>();
    public DbSet<EditableText> EditableTexts => Set<EditableText>();
    public DbSet<PushSubscriptionEntry> PushSubscriptions => Set<PushSubscriptionEntry>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<NotificationItem> NotificationItems => Set<NotificationItem>();
    public DbSet<CompanyDocument> CompanyDocuments => Set<CompanyDocument>();
    public DbSet<CompanyDocumentAttachment> CompanyDocumentAttachments => Set<CompanyDocumentAttachment>();
    public DbSet<WorkSchedule> WorkSchedules => Set<WorkSchedule>();
    public DbSet<ScheduleChangeLog> ScheduleChangeLogs => Set<ScheduleChangeLog>();
    public DbSet<PageStat> PageStats => Set<PageStat>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<UserCounter>()
            .HasIndex(c => c.UserId)
            .IsUnique();

        // 공지 첨부파일: 공지 삭제 시 첨부도 함께 삭제
        builder.Entity<NoticeAttachment>()
            .HasOne<Notice>()
            .WithMany()
            .HasForeignKey(a => a.NoticeId)
            .OnDelete(DeleteBehavior.Cascade);

        // 근태: (직원, 일자) 중복 방지
        builder.Entity<AttendanceRecord>()
            .HasIndex(a => new { a.UserId, a.WorkDate })
            .IsUnique();

        // 금액/일수 정밀도
        builder.Entity<LeaveRequest>().Property(x => x.Days).HasPrecision(6, 2);
        builder.Entity<RewardRecord>().Property(x => x.Amount).HasPrecision(6, 2);
        builder.Entity<RewardRecord>().Property(x => x.WorkHours).HasPrecision(6, 2);

        // AppSetting: Key가 PK
        builder.Entity<AppSetting>().HasKey(a => a.Key);
        builder.Entity<AppSetting>().Property(a => a.Key).HasMaxLength(100);

        // WorkSchedule: (UserId, Date) 고유
        builder.Entity<WorkSchedule>()
            .HasIndex(w => new { w.UserId, w.Date }).IsUnique();
        // PageStat: (Role, Page) 고유
        builder.Entity<PageStat>()
            .HasIndex(p => new { p.Role, p.Page }).IsUnique();

        // CompanyDocumentAttachment: Content longblob, FK 인덱스
        builder.Entity<CompanyDocumentAttachment>()
            .Property(a => a.Content).HasColumnType("longblob");
        builder.Entity<CompanyDocumentAttachment>()
            .HasIndex(a => a.DocumentId);

        // NotificationItem: UserId + 미읽음 + 시각 인덱스
        builder.Entity<NotificationItem>()
            .HasIndex(n => new { n.UserId, n.IsRead });
        builder.Entity<NotificationItem>()
            .HasIndex(n => n.CreatedAt);

        // PushSubscription: Endpoint 고유 + UserId 인덱스
        builder.Entity<PushSubscriptionEntry>()
            .Property(p => p.Endpoint).HasMaxLength(500);
        builder.Entity<PushSubscriptionEntry>()
            .HasIndex(p => p.Endpoint).IsUnique();
        builder.Entity<PushSubscriptionEntry>()
            .HasIndex(p => p.UserId);

        // 편집 가능 텍스트: Key 고유
        builder.Entity<EditableText>()
            .Property(e => e.Key).HasMaxLength(150);
        builder.Entity<EditableText>()
            .HasIndex(e => e.Key).IsUnique();

        // 인사이트: 하루 1개 브리핑, URL 중복 방지
        builder.Entity<InsightBriefing>()
            .HasIndex(b => b.BriefingDate)
            .IsUnique();
        // URL은 길이가 길어 인덱스 키 길이 제한에 걸릴 수 있음 → 앞 191자만 인덱싱
        builder.Entity<InsightArticle>()
            .Property(a => a.Url)
            .HasMaxLength(500);
        builder.Entity<InsightArticle>()
            .HasIndex(a => a.Url)
            .IsUnique();
    }
}
