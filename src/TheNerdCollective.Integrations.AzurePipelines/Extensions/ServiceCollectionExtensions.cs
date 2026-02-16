// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace TheNerdCollective.Integrations.AzurePipelines.Extensions;

/// <summary>
/// Extension methods for registering Azure Pipelines API integration services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds Azure Pipelines API integration services to the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection to add services to.</param>
    /// <param name="configuration">The application configuration containing Azure Pipelines settings.</param>
    /// <returns>The service collection for method chaining.</returns>
    /// <remarks>
    /// Configure in appsettings.json:
    /// <code>
    /// {
    ///   "AzurePipelines": {
    ///     "Token": "your_personal_access_token",
    ///     "Organization": "your_organization",
    ///     "Project": "your_project",
    ///     "ApiVersion": "7.0"
    ///   }
    /// }
    /// </code>
    /// 
    /// Usage in Program.cs:
    /// <code>
    /// services.AddAzurePipelinesIntegration(configuration);
    /// </code>
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when services or configuration is null.</exception>
    public static IServiceCollection AddAzurePipelinesIntegration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.Configure<AzurePipelinesOptions>(configuration.GetSection("AzurePipelines"));
        services.AddHttpClient<AzurePipelinesService>();

        return services;
    }
}
