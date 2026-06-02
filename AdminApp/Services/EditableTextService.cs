using AdminApp.Data;
using Microsoft.EntityFrameworkCore;

namespace AdminApp.Services;

/// <summary>
/// 화면에 노출되는 편집 가능 텍스트(제목/소제목)를 관리한다.
/// 싱글톤 — 앱 메모리에 캐시하고 관리자가 저장하면 즉시 반영.
/// </summary>
public class EditableTextService(IDbContextFactory<ApplicationDbContext> dbFactory)
{
    /// <summary>
    /// 키, 기본값, 설명, 그룹 정의.
    /// 새 텍스트를 추가하려면 여기에만 추가하면 자동으로 관리자 UI에 노출됨.
    /// </summary>
    public static readonly IReadOnlyList<TextDefinition> Definitions = new List<TextDefinition>
    {
        // === 홈 ===
        new("home.notices.title", "공지사항", "홈 — 공지사항 카드 제목", "홈"),
        new("home.calendar.title", "사내 일정", "홈 — 캘린더 카드 제목", "홈"),
        new("home.insight.title", "에듀테크 동향 브리핑", "홈 — 인사이트 위젯 큰 제목", "홈"),
        new("home.insight.summary", "3줄 요약", "홈 — 인사이트 위젯 소제목 (요약)", "홈"),
        new("home.insight.news", "핵심 뉴스 리스트", "홈 — 인사이트 위젯 소제목 (뉴스)", "홈"),

        // === 비품/간식 ===
        new("supplies.page.title", "비품 / 간식 요청", "비품/간식 — 페이지 큰 제목", "비품/간식"),
        new("supplies.items.title", "비품 요청", "비품/간식 — 비품 카드 소제목", "비품/간식"),
        new("supplies.snacks.title", "간식 요청", "비품/간식 — 간식 카드 소제목", "비품/간식"),

        // === 공용 기기/계정 ===
        new("shared.page.title", "공용 기기 / 계정", "공용 — 페이지 큰 제목", "공용 기기/계정"),
        new("shared.devices.title", "공용 기기", "공용 — 기기 카드 소제목", "공용 기기/계정"),
        new("shared.accounts.title", "공용 계정", "공용 — 계정 카드 소제목", "공용 기기/계정"),

        // === 회의실 예약 ===
        new("reservations.page.title", "회의실 예약", "회의실 예약 — 페이지 큰 제목", "회의실 예약"),

        // === 인사이트 아카이브 ===
        new("insights.page.title", "인사이트 아카이브", "인사이트 아카이브 — 페이지 큰 제목", "인사이트 아카이브"),

        // === 버그 트래커 ===
        new("bugs.page.title", "버그 트래커", "버그 트래커 — 페이지 큰 제목", "버그 트래커"),
    };

    private readonly Dictionary<string, string> _cache = new();
    private readonly SemaphoreSlim _initLock = new(1, 1);
    private bool _initialized = false;

    public string Get(string key)
    {
        if (_cache.TryGetValue(key, out var v)) return v;
        return Definitions.FirstOrDefault(d => d.Key == key)?.DefaultValue ?? key;
    }

    public async Task EnsureLoadedAsync()
    {
        if (_initialized) return;
        await _initLock.WaitAsync();
        try
        {
            if (_initialized) return;
            await using var db = await dbFactory.CreateDbContextAsync();
            var stored = await db.EditableTexts.AsNoTracking().ToListAsync();
            _cache.Clear();
            foreach (var t in stored) _cache[t.Key] = t.Value;
            _initialized = true;
        }
        finally { _initLock.Release(); }
    }

    public async Task SetAsync(string key, string value)
    {
        var def = Definitions.FirstOrDefault(d => d.Key == key);
        if (def == null) throw new InvalidOperationException($"Unknown text key: {key}");
        await using var db = await dbFactory.CreateDbContextAsync();
        var existing = await db.EditableTexts.FirstOrDefaultAsync(t => t.Key == key);
        if (existing == null)
        {
            db.EditableTexts.Add(new EditableText { Key = key, Value = value, UpdatedAt = DateTime.UtcNow });
        }
        else
        {
            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        _cache[key] = value;
    }

    public async Task ResetAsync(string key)
    {
        var def = Definitions.FirstOrDefault(d => d.Key == key);
        if (def == null) return;
        await using var db = await dbFactory.CreateDbContextAsync();
        await db.EditableTexts.Where(t => t.Key == key).ExecuteDeleteAsync();
        _cache.Remove(key);
    }

    public sealed record TextDefinition(string Key, string DefaultValue, string Description, string Group);
}
