// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace TheNerdCollective.Integrations.GitHub.Extensions;

/// <summary>
/// Extension methods for registering GitHub API integration services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds GitHub API integration services to the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection to add services to.</param>
    /// <param name="configuration">The application configuration containing GitHub settings.</param>
    /// <returns>The service collection for method chaining.</returns>
    /// <remarks>
    /// Configure in appsettings.json:
    /// <code>
    /// {
    ///   "GitHub": {
    ///     "Token": "your_personal_access_token",
    ///     "Owner": "repository_owner",
    ///     "Repository": "repository_name"
    ///   }
    /// }
    /// </code>
    /// 
    /// Usage in Program.cs:
    /// <code>
    /// services.AddGitHubIntegration(configuration);
    /// </code>
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when services or configuration is null.</exception>
    public static IServiceCollection AddGitHubIntegration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.Configure<GitHubOptions>(configuration.GetSection("GitHub"));
        services.AddHttpClient<GitHubService>();

        return services;
    }
}
