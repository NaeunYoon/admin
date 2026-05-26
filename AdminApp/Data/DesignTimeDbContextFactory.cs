using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AdminApp.Data;

/// <summary>
/// 디자인 타임(EF 마이그레이션 생성) 전용 DbContext 팩토리.
/// 실제 DB 연결 없이 모델만 읽으므로, 'dotnet ef migrations add' 가 앱 시작(Program.Main)을 거치지 않게 한다.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseMySql(
                "Server=localhost;Port=3306;Database=admindb;User=root;Password=design;",
                new MariaDbServerVersion(new Version(10, 11, 0)))
            .Options;
        return new ApplicationDbContext(options);
    }
}
