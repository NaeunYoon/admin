using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AdminApp.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Notice> Notices => Set<Notice>();
    public DbSet<UserCounter> UserCounters => Set<UserCounter>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<RewardRecord> RewardRecords => Set<RewardRecord>();
    public DbSet<SupplyRequest> SupplyRequests => Set<SupplyRequest>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<UserCounter>()
            .HasIndex(c => c.UserId)
            .IsUnique();

        // 금액/일수 정밀도
        builder.Entity<LeaveRequest>().Property(x => x.Days).HasPrecision(6, 2);
        builder.Entity<RewardRecord>().Property(x => x.Amount).HasPrecision(6, 2);
        builder.Entity<RewardRecord>().Property(x => x.WorkHours).HasPrecision(6, 2);
    }
}
