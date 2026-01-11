namespace TheNerdCollective.Services.BlazorServer;

/// <summary>
/// Deployment status phases for blue-green deployments:
/// - normal: Application is running normally
/// - preparing: Build started, preparing containers
/// - deploying: Container revision being deployed (green slot)
/// - verifying: Health checks on green revision
/// - switching: Traffic switch in progress
/// - completed: Deployment completed, back to normal soon
/// - maintenance: Manual maintenance mode
/// </summary>
public sealed class ReconnectionStatus
{
    /// <summary>
    /// Current deployment status. Values: normal, preparing, deploying, verifying, switching, completed, maintenance
    /// </summary>
    public string Status { get; set; } = "normal";

    public string? ReconnectingMessage { get; set; }
    public string? DeploymentMessage { get; set; }
    public string? Version { get; set; }
    public IReadOnlyList<string>? Features { get; set; }
    public int? EstimatedDurationMinutes { get; set; }
}
