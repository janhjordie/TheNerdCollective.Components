using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TheNerdCollective.Services.Azure;

namespace TheNerdCollective.Services.Extensions;

/// <summary>
/// Dependency injection extensions for TheNerdCollective.Services package.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds Azure Blob Storage service to the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection to add services to.</param>
    /// <param name="configuration">The application configuration containing Azure Blob settings.</param>
    /// <returns>The service collection for method chaining.</returns>
    /// <remarks>
    /// Configure in appsettings.json:
    /// <code>
    /// {
    ///   "AzureBlob": {
    ///     "ConnectionString": "DefaultEndpointsProtocol=...",
    ///     "ContainerName": "my-container"
    ///   }
    /// }
    /// </code>
    /// 
    /// Usage in Program.cs:
    /// <code>
    /// services.AddAzureBlobService(configuration);
    /// </code>
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when services or configuration is null.</exception>
    /// <exception cref="InvalidOperationException">Thrown when required configuration values are missing.</exception>
    public static IServiceCollection AddAzureBlobService(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.Configure<AzureBlobOptions>(options =>
        {
            var section = configuration.GetSection(AzureBlobOptions.AppSettingKey);
            options.ConnectionString = section["ConnectionString"] ?? throw new InvalidOperationException("ConnectionString is required in AzureBlob configuration");
            options.ContainerName = section["ContainerName"] ?? throw new InvalidOperationException("ContainerName is required in AzureBlob configuration");
        });

        services.AddSingleton<AzureBlobService>();

        return services;
    }
}

