// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

namespace TheNerdCollective.Integrations.AzurePipelines;

/// <summary>
/// Configuration options for Azure Pipelines API integration.
/// Configure these in appsettings.json under the "AzurePipelines" section.
/// </summary>
public class AzurePipelinesOptions
{
    /// <summary>
    /// Gets or sets the Azure DevOps Personal Access Token (PAT).
    /// Generate from: https://dev.azure.com/{organization}/_usersSettings/tokens
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Azure DevOps organization name.
    /// Example: "your-org" from https://dev.azure.com/your-org
    /// </summary>
    public string Organization { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Azure DevOps project name.
    /// Example: "MyProject"
    /// </summary>
    public string Project { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the API version to use.
    /// Default: "7.0" (recommended for latest features)
    /// </summary>
    public string ApiVersion { get; set; } = "7.0";
}
