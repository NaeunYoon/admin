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

        // 금액/일수 정밀도
        builder.Entity<LeaveRequest>().Property(x => x.Days).HasPrecision(6, 2);
        builder.Entity<RewardRecord>().Property(x => x.Amount).HasPrecision(6, 2);
        builder.Entity<RewardRecord>().Property(x => x.WorkHours).HasPrecision(6, 2);
    }
}
