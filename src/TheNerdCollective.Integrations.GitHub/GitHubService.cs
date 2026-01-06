// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using TheNerdCollective.Integrations.GitHub.Models;

namespace TheNerdCollective.Integrations.GitHub;

/// <summary>
/// Service for interacting with GitHub API v3.
/// https://docs.github.com/en/rest
/// </summary>
public class GitHubService
{
    private readonly HttpClient _httpClient;
    private readonly GitHubOptions _options;
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private const string GITHUB_API_BASE_URL = "https://api.github.com";

    public GitHubService(HttpClient httpClient, IOptions<GitHubOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;

        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        _httpClient.BaseAddress = new Uri(GITHUB_API_BASE_URL);
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_options.Token}");
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/vnd.github+json");
        _httpClient.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "TheNerdCollective.Integrations.GitHub/1.0.0");
    }

    /// <summary>
    /// Get the latest workflow runs for the configured repository.
    /// </summary>
    /// <param name="limit">Maximum number of runs to retrieve (default: 10, max: 100)</param>
    /// <param name="status">Filter by status: completed, action_required, cancelled, failure, neutral, skipped, stale, success, timed_out, in_progress, queued, requested, waiting</param>
    /// <param name="conclusion">Filter by conclusion: action_required, cancelled, failure, neutral, success, skipped, stale, timed_out</param>
    /// <returns>List of workflow runs</returns>
    public async Task<List<WorkflowRun>> GetLatestWorkflowRunsAsync(int limit = 10, string? status = null, string? conclusion = null)
    {
        try
        {
            limit = Math.Min(limit, 100); // GitHub API max is 100 per page
            var url = $"/repos/{_options.Owner}/{_options.Repository}/actions/runs?per_page={limit}";

            if (!string.IsNullOrEmpty(status))
            {
                url += $"&status={status}";
            }

            if (!string.IsNullOrEmpty(conclusion))
            {
                url += $"&conclusion={conclusion}";
            }

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<WorkflowRunsResponse>(contentStr, SerializerOptions);

            return data?.WorkflowRuns ?? new List<WorkflowRun>();
        }
        catch
        {
            return new List<WorkflowRun>();
        }
    }

    /// <summary>
    /// Get workflow runs filtered by various criteria.
    /// </summary>
    public async Task<List<WorkflowRun>> GetWorkflowRunsAsync(
        int limit = 10,
        string? status = null,
        string? conclusion = null,
        string? actor = null,
        string? branch = null,
        string? event = null,
        string? sort = "created",
        string? direction = "desc")
    {
        try
        {
            limit = Math.Min(limit, 100);
            var url = $"/repos/{_options.Owner}/{_options.Repository}/actions/runs?per_page={limit}&sort={sort}&direction={direction}";

            if (!string.IsNullOrEmpty(status))
            {
                url += $"&status={status}";
            }

            if (!string.IsNullOrEmpty(conclusion))
            {
                url += $"&conclusion={conclusion}";
            }

            if (!string.IsNullOrEmpty(actor))
            {
                url += $"&actor={actor}";
            }

            if (!string.IsNullOrEmpty(branch))
            {
                url += $"&branch={branch}";
            }

            if (!string.IsNullOrEmpty(@event))
            {
                url += $"&event={@event}";
            }

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<WorkflowRunsResponse>(contentStr, SerializerOptions);

            return data?.WorkflowRuns ?? new List<WorkflowRun>();
        }
        catch
        {
            return new List<WorkflowRun>();
        }
    }

    /// <summary>
    /// Get a specific workflow run by ID.
    /// </summary>
    public async Task<WorkflowRun?> GetWorkflowRunAsync(long runId)
    {
        try
        {
            var url = $"/repos/{_options.Owner}/{_options.Repository}/actions/runs/{runId}";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var run = JsonSerializer.Deserialize<WorkflowRun>(contentStr, SerializerOptions);

            return run;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Cancel a workflow run.
    /// </summary>
    public async Task<bool> CancelWorkflowRunAsync(long runId)
    {
        try
        {
            var url = $"/repos/{_options.Owner}/{_options.Repository}/actions/runs/{runId}/cancel";
            var response = await _httpClient.PostAsync(url, null);

            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Rerun a workflow run.
    /// </summary>
    public async Task<bool> RerunWorkflowAsync(long runId)
    {
        try
        {
            var url = $"/repos/{_options.Owner}/{_options.Repository}/actions/runs/{runId}/rerun";
            var response = await _httpClient.PostAsync(url, null);

            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Rerun failed jobs in a workflow run.
    /// </summary>
    public async Task<bool> RerunFailedJobsAsync(long runId)
    {
        try
        {
            var url = $"/repos/{_options.Owner}/{_options.Repository}/actions/runs/{runId}/rerun-failed-jobs";
            var response = await _httpClient.PostAsync(url, null);

            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Delete a workflow run.
    /// </summary>
    public async Task<bool> DeleteWorkflowRunAsync(long runId)
    {
        try
        {
            var url = $"/repos/{_options.Owner}/{_options.Repository}/actions/runs/{runId}";
            var response = await _httpClient.DeleteAsync(url);

            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Get workflow run attempts.
    /// </summary>
    public async Task<List<WorkflowRun>> GetWorkflowRunAttemptsAsync(long runId)
    {
        try
        {
            var url = $"/repos/{_options.Owner}/{_options.Repository}/actions/runs/{runId}/attempts";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<WorkflowRunsResponse>(contentStr, SerializerOptions);

            return data?.WorkflowRuns ?? new List<WorkflowRun>();
        }
        catch
        {
            return new List<WorkflowRun>();
        }
    }
}
