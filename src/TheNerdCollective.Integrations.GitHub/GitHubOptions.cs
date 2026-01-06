// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

namespace TheNerdCollective.Integrations.GitHub;

/// <summary>
/// Configuration options for GitHub API integration.
/// Configure these in appsettings.json under the "GitHub" section.
/// </summary>
public class GitHubOptions
{
    /// <summary>
    /// Gets or sets the GitHub Personal Access Token.
    /// Generate from: https://github.com/settings/tokens
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the GitHub repository owner (username or organization).
    /// Example: "janhjordie" or "The-Nerd-Collective"
    /// </summary>
    public string Owner { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the GitHub repository name.
    /// Example: "TheNerdCollective.Components"
    /// </summary>
    public string Repository { get; set; } = string.Empty;
}
