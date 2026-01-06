// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using System.Text.Json.Serialization;

namespace TheNerdCollective.Integrations.GitHub.Models;

/// <summary>
/// Represents the response from the GitHub Actions workflow runs API.
/// </summary>
public class WorkflowRunsResponse
{
    [JsonPropertyName("total_count")]
    public int TotalCount { get; set; }

    [JsonPropertyName("workflow_runs")]
    public List<WorkflowRun> WorkflowRuns { get; set; } = new();
}
