namespace TheNerdCollective.Services.BlazorServer;

using Microsoft.AspNetCore.Components.Server;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

/// <summary>
/// Extension methods for registering Blazor Server services and configuration.
/// This enables shared configuration across multiple Blazor Server applications.
/// 
/// Usage in Program.cs:
///   builder.Services.AddBlazorServerServices(builder.Configuration, builder.Environment);
///   builder.Host.ConfigureBlazorServerShutdown();
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds Blazor Server circuit configuration to the dependency injection container.
    /// Handles long-running sessions and graceful reconnection.
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configuration">Application configuration</param>
    /// <param name="environment">Host environment</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddBlazorServerServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        // Configure Circuit Options to handle long-running sessions and prevent abrupt disconnections
        services.Configure<CircuitOptions>(options =>
        {
            // Reduce timeout for inactive circuits for faster development shutdown (default: 3 minutes)
            // In production, increase to 10-30 minutes: TimeSpan.FromMinutes(10)
            options.DisconnectedCircuitRetentionPeriod = CircuitDefaults.DisconnectedCircuitRetentionPeriod;

            // Maximum number of circuits to retain per session
            options.DisconnectedCircuitMaxRetained = CircuitDefaults.DisconnectedCircuitMaxRetained;

            // Timeout for JS interop calls (default: 1 minute)
            options.JSInteropDefaultCallTimeout = CircuitDefaults.JSInteropDefaultCallTimeout;

            // Increase detailed errors in development for debugging
            options.DetailedErrors = environment.IsDevelopment();
        });

        return services;
    }

    /// <summary>
    /// Configures graceful shutdown timeout for the host.
    /// Reduces default shutdown timeout from 30 seconds to 5 seconds for faster development cycles.
    /// </summary>
    /// <param name="builder">The host builder</param>
    /// <returns>The host builder for chaining</returns>
    public static IHostBuilder ConfigureBlazorServerShutdown(this IHostBuilder builder)
    {
        builder.ConfigureHostOptions(options =>
        {
            options.ShutdownTimeout = TimeSpan.FromSeconds(5);
        });

        return builder;
    }
}
