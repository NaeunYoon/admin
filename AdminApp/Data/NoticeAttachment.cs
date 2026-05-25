namespace AdminApp.Data;

/// <summary>공지사항 첨부파일 (파일 내용을 DB에 저장)</summary>
public class NoticeAttachment
{
    public int Id { get; set; }

    /// <summary>소속 공지 Id</summary>
    public int NoticeId { get; set; }

    /// <summary>원본 파일명</summary>
    public string FileName { get; set; } = "";

    /// <summary>MIME 타입</summary>
    public string? ContentType { get; set; }

    /// <summary>파일 크기 (바이트)</summary>
    public long Size { get; set; }

    /// <summary>파일 바이트 (longblob)</summary>
    public byte[] Content { get; set; } = Array.Empty<byte>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
