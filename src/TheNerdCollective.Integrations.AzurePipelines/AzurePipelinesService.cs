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
    /// Get the latest pipeline runs for the configured project.
    /// </summary>
    /// <param name="limit">Maximum number of runs to retrieve (default: 10)</param>
    /// <param name="statusFilter">Filter by state: inProgress, completed, cancelling, postponed, notStarted</param>
    /// <param name="resultFilter">Filter by result: succeeded, partiallySucceeded, failed, canceled</param>
    /// <returns>List of pipeline runs</returns>
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
    /// Get pipeline runs with advanced filtering and sorting.
    /// </summary>
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
    /// Get a specific pipeline run by ID.
    /// </summary>
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
    /// Queue a new pipeline run (trigger a build).
    /// </summary>
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
    /// Cancel a pipeline run.
    /// </summary>
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
    /// Get all pipelines in the project.
    /// </summary>
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
    /// Get a specific pipeline by ID.
    /// </summary>
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
