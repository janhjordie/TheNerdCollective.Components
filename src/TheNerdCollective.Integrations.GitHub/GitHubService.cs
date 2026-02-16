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
    /// <param name="limit">Maximum number of runs to retrieve (default: 10, max: 100). Will be clamped to 100 if exceeded.</param>
    /// <param name="status">Optional filter by run status. Valid values: completed, action_required, cancelled, failure, neutral, skipped, stale, success, timed_out, in_progress, queued, requested, waiting.</param>
    /// <param name="conclusion">Optional filter by run conclusion. Valid values: action_required, cancelled, failure, neutral, success, skipped, stale, timed_out.</param>
    /// <returns>A list of <see cref="WorkflowRun"/> objects. Returns an empty list if the request fails or no runs are found.</returns>
    /// <remarks>
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.github.com/en/rest/actions/workflow-runs
    /// </remarks>
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
    /// Get workflow runs filtered by various criteria for the configured repository.
    /// </summary>
    /// <param name="limit">Maximum number of runs to retrieve (default: 10, max: 100). Will be clamped to 100 if exceeded.</param>
    /// <param name="status">Optional filter by run status. Valid values: completed, action_required, cancelled, failure, neutral, skipped, stale, success, timed_out, in_progress, queued, requested, waiting.</param>
    /// <param name="conclusion">Optional filter by run conclusion. Valid values: action_required, cancelled, failure, neutral, success, skipped, stale, timed_out.</param>
    /// <param name="actor">Optional filter by the user who triggered the workflow.</param>
    /// <param name="branch">Optional filter by branch name.</param>
    /// <param name="event">Optional filter by event that triggered the workflow (e.g., 'push', 'pull_request', 'schedule').</param>
    /// <param name="sort">Sort results by: created, updated, or status (default: created).</param>
    /// <param name="direction">Sort direction: asc or desc (default: desc).</param>
    /// <returns>A list of <see cref="WorkflowRun"/> objects matching the filters. Returns an empty list if the request fails.</returns>
    /// <remarks>
    /// This method combines multiple filters for flexible querying. All filters are optional.
    /// Uses exponential backoff retry policy (Polly) to handle transient failures.
    /// </remarks>
    public async Task<List<WorkflowRun>> GetWorkflowRunsAsync(
        int limit = 10,
        string? status = null,
        string? conclusion = null,
        string? actor = null,
        string? branch = null,
        string? @event = null,
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
    /// Get a specific workflow run by its ID.
    /// </summary>
    /// <param name="runId">The unique identifier of the workflow run to retrieve.</param>
    /// <returns>A <see cref="WorkflowRun"/> object if found; null if not found or an error occurs during retrieval.</returns>
    /// <remarks>
    /// Uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.github.com/en/rest/actions/workflow-runs#get-a-workflow-run
    /// </remarks>
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
    /// Cancel a workflow run that is in progress.
    /// </summary>
    /// <param name="runId">The unique identifier of the workflow run to cancel.</param>
    /// <returns>True if the cancellation request was successful; false if the request failed or the run cannot be cancelled.</returns>
    /// <remarks>
    /// Only in-progress or queued runs can be cancelled. Already completed runs cannot be cancelled.
    /// Uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.github.com/en/rest/actions/workflow-runs#cancel-a-workflow-run
    /// </remarks>
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
    /// Rerun a complete workflow run.
    /// </summary>
    /// <param name="runId">The unique identifier of the workflow run to rerun.</param>
    /// <returns>True if the rerun request was successful; false if the request failed.</returns>
    /// <remarks>
    /// This reruns all jobs in the workflow. To rerun only failed jobs, use <see cref="RerunFailedJobsAsync"/> instead.
    /// Uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.github.com/en/rest/actions/workflow-runs#rerun-a-workflow
    /// </remarks>
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
    /// Rerun only the failed jobs in a workflow run.
    /// </summary>
    /// <param name="runId">The unique identifier of the workflow run containing failed jobs.</param>
    /// <returns>True if the rerun request was successful; false if the request failed.</returns>
    /// <remarks>
    /// This reruns only jobs that failed in the workflow. To rerun all jobs, use <see cref="RerunWorkflowAsync"/> instead.
    /// Uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.github.com/en/rest/actions/workflow-runs#rerun-failed-jobs-from-a-workflow-run
    /// </remarks>
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
    /// Delete a workflow run from the repository.
    /// </summary>
    /// <param name="runId">The unique identifier of the workflow run to delete.</param>
    /// <returns>True if the deletion was successful; false if the request failed.</returns>
    /// <remarks>
    /// Deletion is permanent and cannot be undone. Only users with admin access to the repository can delete workflow runs.
    /// Uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.github.com/en/rest/actions/workflow-runs#delete-a-workflow-run
    /// </remarks>
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
    /// Get all attempts for a workflow run (includes reruns and retry attempts).
    /// </summary>
    /// <param name="runId">The unique identifier of the workflow run.</param>
    /// <returns>A list of <see cref="WorkflowRun"/> objects representing each attempt. Returns an empty list if not found or an error occurs.</returns>
    /// <remarks>
    /// This method retrieves all attempts for a run, including the initial run and any reruns.
    /// Uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://docs.github.com/en/rest/actions/workflow-runs#get-workflow-run-attempts
    /// </remarks>
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
