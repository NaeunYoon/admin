using Microsoft.JSInterop;

namespace AdminApp;

/// <summary>
/// 클라이언트 하트비트용. JS가 회로(SignalR)를 통해 주기적으로 호출한다.
/// 호출이 실패/타임아웃하면 회로가 죽은 것이므로 클라이언트가 자동 새로고침한다.
/// 호출이 성공하면 그 자체로 회로 keep-alive 효과도 있다.
/// </summary>
public static class CircuitPing
{
    [JSInvokable]
    public static Task<bool> Ping() => Task.FromResult(true);
}
