namespace AdminApp.Data;

/// <summary>
/// 키-값 설정 저장소. VAPID 키 등 시스템 설정 보관.
/// </summary>
public class AppSetting
{
    public string Key { get; set; } = "";   // primary key
    public string Value { get; set; } = "";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
