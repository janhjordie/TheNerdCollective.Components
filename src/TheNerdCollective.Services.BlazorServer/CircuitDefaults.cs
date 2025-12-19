namespace TheNerdCollective.Services.BlazorServer;

/// <summary>
/// Circuit configuration constants for Blazor Server applications.
/// Defines timeouts and retention periods for graceful disconnection handling.
/// </summary>
public static class CircuitDefaults
{
    /// <summary>
    /// Time to retain disconnected circuits before expiration (default: 5 seconds in development).
    /// In production, increase to 10-30 minutes for better user experience.
    /// </summary>
    public static TimeSpan DisconnectedCircuitRetentionPeriod { get; set; } = TimeSpan.FromSeconds(5);

    /// <summary>
    /// Maximum number of disconnected circuits to retain per session (default: 100).
    /// </summary>
    public const int DisconnectedCircuitMaxRetained = 100;

    /// <summary>
    /// Timeout for JavaScript interop calls (default: 30 seconds).
    /// Increase if you have long-running JS operations.
    /// </summary>
    public static TimeSpan JSInteropDefaultCallTimeout { get; set; } = TimeSpan.FromSeconds(30);
}
