using System.Text.RegularExpressions;
using AdminApp.Data;
using Microsoft.EntityFrameworkCore;

namespace AdminApp.Services;

/// <summary>
/// 평일 오전 8시 KST에 1회 Brave Search로 에듀테크/교육게임 동향을 수집해
/// 일일 브리핑(핵심 뉴스 5개)을 생성한다.
/// </summary>
public class InsightFetcherService(
    IServiceProvider services,
    ILogger<InsightFetcherService> logger) : BackgroundService
{
    // 교육게임/에듀테크 산업 중심 검색 쿼리 — 한국어 위주
    private static readonly string[] Queries =
    {
        // ===== 1순위: 한국교원대 에듀테크 / 정부과제 (최우선) =====
        "한국교원대 에듀테크소프트랩 OR 에듀테크연구센터 실증",
        "한국교원대학교 교육용 게임 OR 교수학습 콘텐츠 OR AI 코스웨어 과제",
        "한국교원대 융합교육연구소 정부과제 OR 협약 OR 공모",
        "충북에듀테크소프트랩 실증 매칭데이",
        "EdTechMatch 교수학습 콘텐츠 개발 공모",
        "교실혁명 선도교사 OR AI 코스웨어 선도학교",
        "KERIS 한국교육학술정보원 에듀테크 실증 OR 공모",
        // ===== 2순위: 에듀테크 교육용 게임 / 앱 =====
        "교육게임 OR 학습게임 OR 어린이게임",
        "콘진원 게임 지원 OR 에듀테크 투자",
    };

    // 관련도 점수표 (제목+스니펫에 포함되면 가중치만큼 +). 1순위 키워드가 압도적으로 높음.
    private static readonly Dictionary<string, int> RelevanceWeights = new(StringComparer.OrdinalIgnoreCase)
    {
        // ===== 1순위: 한국교원대 / 정부과제 (최고 가중치) =====
        ["한국교원대"] = 25, ["교원대"] = 18,
        ["에듀테크소프트랩"] = 22, ["충북에듀테크소프트랩"] = 22,
        ["에듀테크연구센터"] = 20, ["융합교육연구소"] = 20,
        ["EdTechMatch"] = 20, ["에듀테크매치"] = 20,
        ["실증운영"] = 16, ["실증"] = 14, ["매칭데이"] = 14,
        ["AI 코스웨어"] = 15, ["코스웨어"] = 13, ["교수학습 콘텐츠"] = 14,
        ["교실혁명"] = 15, ["선도학교"] = 12, ["선도교사"] = 12,
        ["KERIS"] = 14, ["한국교육학술정보원"] = 14,
        ["정부과제"] = 13, ["공모전"] = 10, ["공모"] = 8, ["협약"] = 8,
        ["RFP"] = 8, ["교육부"] = 9, ["디지털 대전환"] = 8,
        // ===== 2순위: 에듀테크 교육용 게임 / 앱 =====
        ["교육게임"] = 10, ["학습게임"] = 10, ["어린이게임"] = 9, ["교육용 게임"] = 11,
        ["에듀테크"] = 8, ["edtech"] = 8, ["K-에듀테크"] = 8,
        ["콘진원"] = 9, ["콘텐츠진흥원"] = 9, ["지원사업"] = 6,
        ["미니게임"] = 6, ["게이미피케이션"] = 6, ["코딩교육"] = 6,
        ["학습앱"] = 6, ["교육앱"] = 6, ["스마트러닝"] = 5, ["디지털교육"] = 5,
        ["AI교육"] = 5, ["STEM"] = 4,
    };

    // 부적합 키워드 (포함 시 큰 감점)
    private static readonly string[] NegativeKeywords =
    {
        "주식 추천", "코인", "암호화폐", "도박", "포커",
        "성인", "음주운전", "연예인 열애", "정치권 공방", "선거 결과",
        "프로야구", "축구 결과", "골프 대회"
    };

    private const int FeaturedPerDay = 5;       // 하루 5개 핵심 뉴스
    private const int SummaryLineCount = 3;     // 그 중 상위 3개로 3줄 요약
    private const int MinRelevanceScore = 5;    // 이 점수 미만은 제외

    // 한국 표준시 = UTC+9
    private static readonly TimeSpan KstOffset = TimeSpan.FromHours(9);
    private static readonly TimeOnly RunAt = new(8, 0); // 오전 8시 KST

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var nextUtc = NextRunUtc();
            var nextKst = nextUtc + KstOffset;
            var wait = nextUtc - DateTime.UtcNow;
            if (wait < TimeSpan.Zero) wait = TimeSpan.Zero;

            logger.LogInformation("다음 인사이트 수집 예약: {Kst:yyyy-MM-dd ddd HH:mm} KST (대기 {Hours:0.#}시간)",
                nextKst, wait.TotalHours);

            try { await Task.Delay(wait, stoppingToken); }
            catch (TaskCanceledException) { break; }

            try { await FetchOnceAsync(stoppingToken); }
            catch (Exception ex) { logger.LogError(ex, "인사이트 수집 실패"); }
        }
    }

    /// <summary>다음 평일(월~금) 오전 8시 KST를 UTC로 반환</summary>
    private static DateTime NextRunUtc()
    {
        var nowKst = DateTime.UtcNow + KstOffset;
        var todayRun = new DateTime(nowKst.Year, nowKst.Month, nowKst.Day, RunAt.Hour, RunAt.Minute, 0, DateTimeKind.Unspecified);
        var target = nowKst >= todayRun ? todayRun.AddDays(1) : todayRun;
        while (target.DayOfWeek == DayOfWeek.Saturday || target.DayOfWeek == DayOfWeek.Sunday)
            target = target.AddDays(1);
        return DateTime.SpecifyKind(target - KstOffset, DateTimeKind.Utc);
    }

    /// <summary>수집 1회 실행 (관리자 수동 갱신 버튼에서도 호출).</summary>
    public async Task<int> FetchOnceAsync(CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<ApplicationDbContext>>();
        var brave = scope.ServiceProvider.GetRequiredService<BraveSearchService>();

        await using var db = await dbFactory.CreateDbContextAsync(ct);

        // 오늘 브리핑 (없으면 생성)
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(9));
        var briefing = await db.InsightBriefings.FirstOrDefaultAsync(b => b.BriefingDate == today, ct);
        if (briefing == null)
        {
            briefing = new InsightBriefing
            {
                BriefingDate = today,
                SourceNote = "Brave Search 실시간 검색 기반",
                Summary = ""
            };
            db.InsightBriefings.Add(briefing);
            await db.SaveChangesAsync(ct);
        }

        // 모든 쿼리에서 결과 수집
        var allResults = new List<BraveSearchService.BraveResult>();
        foreach (var q in Queries)
        {
            var rs = await brave.SearchAsync(q, count: 10, ct: ct);
            allResults.AddRange(rs);
            try { await Task.Delay(1100, ct); } catch { return 0; }
        }

        // URL 잘라낸 후 중복 제거 (DB 컬럼이 500자라 자른 결과로 비교해야 정확)
        var deduped = allResults
            .Where(r => !string.IsNullOrWhiteSpace(r.Url))
            .Select(r => { r.Url = Truncate(r.Url, 500); return r; })
            .GroupBy(r => r.Url, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();

        // DB에 이미 있는 URL 제외
        var dedupedUrls = deduped.Select(d => d.Url).ToList();
        var existingUrls = await db.InsightArticles
            .Where(a => dedupedUrls.Contains(a.Url))
            .Select(a => a.Url)
            .ToListAsync(ct);
        var existing = new HashSet<string>(existingUrls, StringComparer.OrdinalIgnoreCase);

        int added = 0;
        int skippedDup = 0;
        foreach (var r in deduped)
        {
            if (existing.Contains(r.Url)) continue;
            var cleanTitle = StripHtml(r.Title);
            var cleanDesc = StripHtml(r.Description);
            db.InsightArticles.Add(new InsightArticle
            {
                Title = Truncate(cleanTitle, 280),
                Url = r.Url,
                Source = r.MetaUrl?.Hostname,
                PublishedDate = ParseDate(r.PageAge ?? r.Age),
                OneLineSummary = Truncate(cleanDesc, 400),
                Keywords = string.Join(", ", ExtractKeywords(cleanTitle + " " + cleanDesc)),
                FullContent = null,
                FeaturedOrder = 0,
                CreatedAt = DateTime.UtcNow
            });
            try
            {
                await db.SaveChangesAsync(ct);
                added++;
                existing.Add(r.Url); // 같은 배치 내 중복 차단
            }
            catch (DbUpdateException)
            {
                // 동시성/잔존 중복 → 변경 무시하고 계속
                db.ChangeTracker.Clear();
                skippedDup++;
            }
        }

        // 기존 데이터의 HTML 잔존도 일괄 정리 (마이그레이션 대신)
        var dirty = await db.InsightArticles
            .Where(a => a.Title.Contains("<") || (a.OneLineSummary ?? "").Contains("<"))
            .ToListAsync(ct);
        foreach (var a in dirty)
        {
            a.Title = StripHtml(a.Title);
            a.OneLineSummary = StripHtml(a.OneLineSummary);
        }
        if (dirty.Any()) await db.SaveChangesAsync(ct);

        // 오늘 브리핑 피처 해제 후 재선정
        var todaysFeatured = await db.InsightArticles
            .Where(a => a.BriefingId == briefing.Id)
            .ToListAsync(ct);
        foreach (var a in todaysFeatured) { a.BriefingId = null; a.FeaturedOrder = 0; }
        await db.SaveChangesAsync(ct);

        // 전체 기사 중 관련도 점수로 상위 5개 선정
        var pool = await db.InsightArticles.ToListAsync(ct);
        var scored = pool
            .Select(a => (Article: a, Score: ScoreArticle(a.Title, a.OneLineSummary ?? "")))
            .Where(t => t.Score >= MinRelevanceScore)
            .OrderByDescending(t => t.Score)
            .ThenByDescending(t => t.Article.PublishedDate ?? DateOnly.MinValue)
            .ThenByDescending(t => t.Article.CreatedAt)
            .Take(FeaturedPerDay)
            .ToList();

        for (int i = 0; i < scored.Count; i++)
        {
            scored[i].Article.BriefingId = briefing.Id;
            scored[i].Article.FeaturedOrder = i + 1;
        }

        // 3줄 요약: 상위 3개의 한 줄 요약
        briefing.Summary = string.Join("\n", scored.Take(SummaryLineCount)
            .Select(s => "- " + (s.Article.OneLineSummary ?? "").Trim()));
        briefing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("인사이트 수집 완료: 신규 {Added}건, 정리 {Dirty}건, 피처 {Featured}건",
            added, dirty.Count, scored.Count);
        return added;
    }

    // ========================= 유틸 =========================

    private static readonly Regex HtmlTagRegex = new(@"<[^>]+>", RegexOptions.Compiled);
    private static readonly Regex EntityRegex = new(@"&(amp|lt|gt|quot|#39|#34|nbsp);", RegexOptions.Compiled);

    private static string StripHtml(string? input)
    {
        if (string.IsNullOrEmpty(input)) return "";
        var s = HtmlTagRegex.Replace(input, "");
        s = EntityRegex.Replace(s, m => m.Groups[1].Value switch
        {
            "amp" => "&", "lt" => "<", "gt" => ">",
            "quot" or "#34" => "\"", "#39" => "'", "nbsp" => " ",
            _ => m.Value
        });
        return s.Trim();
    }

    private static string Truncate(string? s, int max) =>
        string.IsNullOrEmpty(s) ? "" : (s.Length <= max ? s : s.Substring(0, max));

    private static DateOnly? ParseDate(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        if (DateTime.TryParse(s, out var dt)) return DateOnly.FromDateTime(dt);
        return null;
    }

    /// <summary>한국어 글자 비율 (0~1)</summary>
    private static double KoreanRatio(string text)
    {
        if (string.IsNullOrEmpty(text)) return 0;
        int hangul = 0, letters = 0;
        foreach (var c in text)
        {
            if (char.IsLetter(c)) letters++;
            if (c >= 0xAC00 && c <= 0xD7A3) hangul++;
        }
        return letters == 0 ? 0 : (double)hangul / letters;
    }

    private static int ScoreArticle(string title, string description)
    {
        var combined = (title ?? "") + " " + (description ?? "");
        int score = 0;

        foreach (var kvp in RelevanceWeights)
        {
            if (combined.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                score += kvp.Value;
        }
        foreach (var neg in NegativeKeywords)
        {
            if (combined.Contains(neg, StringComparison.OrdinalIgnoreCase))
                score -= 10;
        }

        // 한국어 비율 가/감점
        var krRatio = KoreanRatio(combined);
        if (krRatio > 0.5) score += 4;        // 한국어 위주 보너스
        else if (krRatio < 0.1) score -= 6;   // 영문 위주 감점

        return score;
    }

    private static List<string> ExtractKeywords(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return new();
        var found = new List<string>();
        foreach (var k in RelevanceWeights.Keys)
        {
            if (text.Contains(k, StringComparison.OrdinalIgnoreCase) &&
                !found.Contains(k, StringComparer.OrdinalIgnoreCase))
            {
                found.Add(k);
                if (found.Count >= 5) break;
            }
        }
        return found;
    }
}
