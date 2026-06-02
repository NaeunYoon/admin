using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace AdminApp.Services;

/// <summary>
/// Brave Search Web Search API 래퍼. https://api.search.brave.com/res/v1/web/search
/// </summary>
public class BraveSearchService(HttpClient http, ILogger<BraveSearchService> logger)
{
    public async Task<List<BraveResult>> SearchAsync(string query, int count = 20, string country = "KR", string lang = "ko", CancellationToken ct = default)
    {
        // Brave는 한 번에 최대 20개
        count = Math.Clamp(count, 1, 20);
        var url = $"/res/v1/web/search?q={Uri.EscapeDataString(query)}&count={count}&country={country}&search_lang={lang}&freshness=pm"; // pm = past month
        try
        {
            var resp = await http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                logger.LogWarning("Brave Search 실패 {Status}: {Body}", resp.StatusCode, body);
                return new();
            }
            var data = await resp.Content.ReadFromJsonAsync<BraveResponse>(cancellationToken: ct);
            return data?.Web?.Results ?? new();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Brave Search 호출 오류 ({Query})", query);
            return new();
        }
    }

    public sealed class BraveResponse
    {
        [JsonPropertyName("web")] public BraveWeb? Web { get; set; }
    }
    public sealed class BraveWeb
    {
        [JsonPropertyName("results")] public List<BraveResult> Results { get; set; } = new();
    }
    public sealed class BraveResult
    {
        [JsonPropertyName("title")] public string Title { get; set; } = "";
        [JsonPropertyName("url")] public string Url { get; set; } = "";
        [JsonPropertyName("description")] public string Description { get; set; } = "";
        [JsonPropertyName("age")] public string? Age { get; set; }       // "May 8, 2026" 또는 ISO
        [JsonPropertyName("page_age")] public string? PageAge { get; set; }  // ISO 형태
        [JsonPropertyName("meta_url")] public BraveMetaUrl? MetaUrl { get; set; }
    }
    public sealed class BraveMetaUrl
    {
        [JsonPropertyName("hostname")] public string? Hostname { get; set; }
    }
}
