namespace AdminApp.Data;

/// <summary>
/// 사내 문서 첨부파일 (longblob에 직접 저장).
/// </summary>
public class CompanyDocumentAttachment
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long Size { get; set; }
    public byte[] Content { get; set; } = Array.Empty<byte>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
