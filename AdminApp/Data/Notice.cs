using System.ComponentModel.DataAnnotations;

namespace AdminApp.Data;

/// <summary>공지사항</summary>
public class Notice
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = "";

    public string Content { get; set; } = "";

    /// <summary>작성자 사용자 Id</summary>
    public string? AuthorId { get; set; }

    /// <summary>작성자 표시 이름 (조회 편의용)</summary>
    public string? AuthorName { get; set; }

    /// <summary>상단 고정 여부</summary>
    public bool IsPinned { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
