// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using System.Text.Json.Serialization;

namespace TheNerdCollective.Integrations.AzurePipelines.Models;

/// <summary>
/// Represents the response from the Azure Pipelines runs API.
/// </summary>
public class PipelineRunsResponse
{
    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("value")]
    public List<PipelineRun> Value { get; set; } = new();
}

/// <summary>
/// Represents the response from the Azure Pipelines list API.
/// </summary>
public class PipelinesResponse
{
    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("value")]
    public List<Pipeline> Value { get; set; } = new();
}
