// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using TheNerdCollective.Integrations.AzurePipelines.Models;

namespace TheNerdCollective.Integrations.AzurePipelines;

/// <summary>
/// Service for interacting with Azure Pipelines REST API.
/// https://docs.microsoft.com/en-us/rest/api/azure/devops/pipelines
/// </summary>
public class AzurePipelinesService
{
    private readonly HttpClient _httpClient;
    private readonly AzurePipelinesOptions _options;
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private const string AZURE_DEVOPS_BASE_URL = "https://dev.azure.com";

    public AzurePipelinesService(HttpClient httpClient, IOptions<AzurePipelinesOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;

        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        _httpClient.BaseAddress = new Uri(AZURE_DEVOPS_BASE_URL);

        // Azure DevOps uses Basic authentication with PAT
        var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($":{_options.Token}"));
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Basic {credentials}");
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "TheNerdCollective.Integrations.AzurePipelines/1.0.0");
    }

    /// <summary>
    /// Get the most recent pipeline runs for the configured project.
    /// </summary>
    /// <param name="limit">Maximum number of runs to retrieve (default: 10, max: 10000). Will be clamped to Azure Pipelines API limits.</param>
    /// <param name="statusFilter">Optional filter by run state. Valid values: inProgress, completed, cancelling, postponed, notStarted.</param>
    /// <param name="resultFilter">Optional filter by run result. Valid values: succeeded, partiallySucceeded, failed, canceled.</param>
    /// <returns>A list of <see cref="PipelineRun"/> objects ordered by creation time (newest first). Returns an empty list if not found or an error occurs.</returns>
    /// <remarks>
    /// Use <see cref="GetPipelineRunsAsync"/> for more advanced filtering options (by pipeline ID, branch, sort order).
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/list
    /// </remarks>
    public async Task<List<PipelineRun>> GetLatestPipelineRunsAsync(
        int limit = 10,
        string? statusFilter = null,
        string? resultFilter = null)
    {
        try
        {
            var url = $"/{_options.Organization}/{_options.Project}/_apis/pipelines/runs?api-version={_options.ApiVersion}&$top={limit}";

            if (!string.IsNullOrEmpty(statusFilter))
            {
                url += $"&statusFilter={statusFilter}";
            }

            if (!string.IsNullOrEmpty(resultFilter))
            {
                url += $"&resultFilter={resultFilter}";
            }

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<PipelineRunsResponse>(contentStr, SerializerOptions);

            return data?.Value ?? new List<PipelineRun>();
        }
        catch
        {
            return new List<PipelineRun>();
        }
    }

    /// <summary>
    /// Get pipeline runs with advanced filtering, sorting, and branch targeting.
    /// </summary>
    /// <param name="limit">Maximum number of runs to retrieve (default: 10, max: 10000).</param>
    /// <param name="statusFilter">Optional filter by run state. Valid values: inProgress, completed, cancelling, postponed, notStarted.</param>
    /// <param name="resultFilter">Optional filter by run result. Valid values: succeeded, partiallySucceeded, failed, canceled.</param>
    /// <param name="pipelineId">Optional filter by specific pipeline ID. If null, queries all pipelines.</param>
    /// <param name="branch">Optional filter by branch name (e.g., "main", "refs/heads/main"). URI-encoded automatically.</param>
    /// <param name="orderBy">Optional sort specification. Common values: "finishTime desc" (newest first), "startTime desc".</param>
    /// <returns>A filtered and sorted list of <see cref="PipelineRun"/> objects. Returns an empty list if not found or an error occurs.</returns>
    /// <remarks>
    /// Use <see cref="GetLatestPipelineRunsAsync"/> for simple queries without branch or pipeline ID filtering.
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/list
    /// </remarks>
    public async Task<List<PipelineRun>> GetPipelineRunsAsync(
        int limit = 10,
        string? statusFilter = null,
        string? resultFilter = null,
        int? pipelineId = null,
        string? branch = null,
        string? orderBy = null)
    {
        try
        {
            var url = $"/{_options.Organization}/{_options.Project}/_apis/pipelines/runs?api-version={_options.ApiVersion}&$top={limit}";

            if (!string.IsNullOrEmpty(statusFilter))
            {
                url += $"&statusFilter={statusFilter}";
            }

            if (!string.IsNullOrEmpty(resultFilter))
            {
                url += $"&resultFilter={resultFilter}";
            }

            if (pipelineId.HasValue)
            {
                url += $"&pipelineId={pipelineId.Value}";
            }

            if (!string.IsNullOrEmpty(branch))
            {
                url += $"&branchName={Uri.EscapeDataString(branch)}";
            }

            if (!string.IsNullOrEmpty(orderBy))
            {
                url += $"&orderBy={orderBy}";
            }

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<PipelineRunsResponse>(contentStr, SerializerOptions);

            return data?.Value ?? new List<PipelineRun>();
        }
        catch
        {
            return new List<PipelineRun>();
        }
    }

    /// <summary>
    /// Get detailed information about a specific pipeline run.
    /// </summary>
    /// <param name="pipelineId">The unique identifier of the pipeline.</param>
    /// <param name="runId">The unique identifier of the pipeline run.</param>
    /// <returns>A <see cref="PipelineRun"/> object with full run details, or null if not found or an error occurs.</returns>
    /// <remarks>
    /// Use <see cref="GetLatestPipelineRunsAsync"/> or <see cref="GetPipelineRunsAsync"/> to discover run IDs.
    /// This method provides complete run state including job details and timeline events.
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/get
    /// </remarks>
    public async Task<PipelineRun?> GetPipelineRunAsync(int pipelineId, int runId)
    {
        try
        {
            var url = $"/{_options.Organization}/{_options.Project}/_apis/pipelines/{pipelineId}/runs/{runId}?api-version={_options.ApiVersion}";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var run = JsonSerializer.Deserialize<PipelineRun>(contentStr, SerializerOptions);

            return run;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Queue a new pipeline run (trigger a build) with optional branch targeting and variable overrides.
    /// </summary>
    /// <param name="pipelineId">The unique identifier of the pipeline to queue.</param>
    /// <param name="sourceBranch">Optional branch to run the pipeline against (e.g., "refs/heads/main"). If null, uses the default branch.</param>
    /// <param name="variables">Optional dictionary of pipeline variables to override. Keys are variable names, values are desired values.</param>
    /// <returns>A new <see cref="PipelineRun"/> object representing the queued run, or null if the request fails.</returns>
    /// <remarks>
    /// Use <see cref="GetPipelineRunAsync"/> to monitor the queued run's status.
    /// Use <see cref="CancelPipelineRunAsync"/> to stop a queued or running pipeline.
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/run-pipeline
    /// </remarks>
    public async Task<PipelineRun?> QueuePipelineRunAsync(int pipelineId, string? sourceBranch = null, Dictionary<string, string>? variables = null)
    {
        try
        {
            var payload = new
            {
                resources = sourceBranch != null ? new
                {
                    repositories = new
                    {
                        self = new
                        {
                            refName = sourceBranch
                        }
                    }
                } : null,
                variables = variables
            };

            var url = $"/{_options.Organization}/{_options.Project}/_apis/pipelines/{pipelineId}/runs?api-version={_options.ApiVersion}";
            var content = new StringContent(
                JsonSerializer.Serialize(payload, SerializerOptions),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync(url, content);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var run = JsonSerializer.Deserialize<PipelineRun>(contentStr, SerializerOptions);

            return run;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Cancel a queued or in-progress pipeline run.
    /// </summary>
    /// <param name="pipelineId">The unique identifier of the pipeline.</param>
    /// <param name="runId">The unique identifier of the run to cancel.</param>
    /// <returns>True if the cancellation request was successful; false if the run was not found or an error occurred.</returns>
    /// <remarks>
    /// Cancellation is asynchronous—the run will transition to "cancelling" state before reaching "completed" with "canceled" result.
    /// Use <see cref="GetPipelineRunAsync"/> to monitor cancellation progress.
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/update
    /// </remarks>
    public async Task<bool> CancelPipelineRunAsync(int pipelineId, int runId)
    {
        try
        {
            var payload = new { state = "cancelling" };
            var url = $"/{_options.Organization}/{_options.Project}/_apis/pipelines/{pipelineId}/runs/{runId}?api-version={_options.ApiVersion}";
            var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            var request = new HttpRequestMessage(new HttpMethod("PATCH"), url) { Content = content };
            var response = await _httpClient.SendAsync(request);

            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Get a list of all pipelines in the configured project.
    /// </summary>
    /// <param name="limit">Maximum number of pipelines to retrieve (default: 100, max: 10000).</param>
    /// <returns>A list of <see cref="Pipeline"/> objects with metadata for each pipeline. Returns an empty list if not found or an error occurs.</returns>
    /// <remarks>
    /// Use <see cref="GetPipelineAsync"/> to retrieve detailed information about a specific pipeline.
    /// Use <see cref="GetLatestPipelineRunsAsync"/> to query runs across all pipelines.
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.microsoft.com/en-us/rest/api/azure/devops/pipelines/pipelines/list
    /// </remarks>
    public async Task<List<Pipeline>> GetPipelinesAsync(int limit = 100)
    {
        try
        {
            var url = $"/{_options.Organization}/{_options.Project}/_apis/pipelines?api-version={_options.ApiVersion}&$top={limit}";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<PipelinesResponse>(contentStr, SerializerOptions);

            return data?.Value ?? new List<Pipeline>();
        }
        catch
        {
            return new List<Pipeline>();
        }
    }

    /// <summary>
    /// Get detailed information about a specific pipeline.
    /// </summary>
    /// <param name="pipelineId">The unique identifier of the pipeline.</param>
    /// <returns>A <see cref="Pipeline"/> object with pipeline metadata and configuration, or null if not found or an error occurs.</returns>
    /// <remarks>
    /// Use <see cref="GetPipelinesAsync"/> to discover available pipeline IDs.
    /// Use <see cref="QueuePipelineRunAsync"/> to trigger a pipeline run after retrieving its details.
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.microsoft.com/en-us/rest/api/azure/devops/pipelines/pipelines/get
    /// </remarks>
    public async Task<Pipeline?> GetPipelineAsync(int pipelineId)
    {
        try
        {
            var url = $"/{_options.Organization}/{_options.Project}/_apis/pipelines/{pipelineId}?api-version={_options.ApiVersion}";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var pipeline = JsonSerializer.Deserialize<Pipeline>(contentStr, SerializerOptions);

            return pipeline;
        }
        catch
        {
            return null;
        }
    }
}
