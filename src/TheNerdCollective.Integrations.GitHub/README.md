# TheNerdCollective.Integrations.GitHub

A comprehensive .NET integration library for the GitHub API v3, providing seamless access to GitHub Actions workflow management and repository information.

## Features

- **Workflow Run Management**: Retrieve, filter, and manage GitHub Actions workflow runs
- **Status Filtering**: Filter workflow runs by status, conclusion, actor, branch, and event
- **Workflow Control**: Cancel, rerun, rerun failed jobs, and delete workflow runs
- **Attempt Tracking**: Access workflow run attempts for debugging and analysis
- **Async/Await Support**: Fully asynchronous API for high-performance applications
- **Configurable**: Easy setup with dependency injection and configuration

## Installation

```bash
dotnet add package TheNerdCollective.Integrations.GitHub
```

## Quick Start

### 1. Configure in `appsettings.json`

```json
{
  "GitHub": {
    "Token": "your_github_personal_access_token",
    "Owner": "your-username-or-org",
    "Repository": "your-repo-name"
  }
}
```

### 2. Register in Dependency Injection (Program.cs)

```csharp
builder.Services.Configure<GitHubOptions>(
    builder.Configuration.GetSection("GitHub"));
builder.Services.AddHttpClient<GitHubService>();
```

### 3. Use the Service

```csharp
public class MyService
{
    private readonly GitHubService _gitHubService;

    public MyService(GitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task CheckWorkflows()
    {
        // Get latest 10 workflow runs
        var runs = await _gitHubService.GetLatestWorkflowRunsAsync(limit: 10);

        foreach (var run in runs)
        {
            Console.WriteLine($"{run.Name}: {run.Status} - {run.Conclusion}");
        }
    }

    public async Task GetFailedRuns()
    {
        // Get failed workflow runs
        var failedRuns = await _gitHubService.GetWorkflowRunsAsync(
            limit: 20,
            conclusion: "failure"
        );

        return failedRuns;
    }

    public async Task RerunWorkflow(long runId)
    {
        var success = await _gitHubService.RerunWorkflowAsync(runId);
        return success;
    }
}
```

## API Reference

### `GetLatestWorkflowRunsAsync(int limit, string? status, string? conclusion)`

Retrieve the latest workflow runs with optional filtering.

**Parameters:**
- `limit` (int, default: 10): Maximum runs to retrieve (max: 100)
- `status` (string, optional): Filter by status (completed, in_progress, queued, requested, waiting, etc.)
- `conclusion` (string, optional): Filter by conclusion (success, failure, neutral, cancelled, skipped, timed_out, action_required)

**Returns:** `Task<List<WorkflowRun>>`

### `GetWorkflowRunsAsync(int limit, string? status, string? conclusion, string? actor, string? branch, string? event, string? sort, string? direction)`

Advanced filtering for workflow runs.

**Parameters:**
- `limit` (int, default: 10): Maximum runs to retrieve
- `status`, `conclusion`: Standard filters
- `actor` (string, optional): Filter by actor (username)
- `branch` (string, optional): Filter by branch name
- `event` (string, optional): Filter by event type (push, pull_request, schedule, etc.)
- `sort` (string, default: "created"): Sort field
- `direction` (string, default: "desc"): Sort direction (asc/desc)

**Returns:** `Task<List<WorkflowRun>>`

### `GetWorkflowRunAsync(long runId)`

Get details of a specific workflow run.

**Parameters:**
- `runId` (long): The workflow run ID

**Returns:** `Task<WorkflowRun?>`

### `CancelWorkflowRunAsync(long runId)`

Cancel a running workflow.

**Parameters:**
- `runId` (long): The workflow run ID

**Returns:** `Task<bool>` (success status)

### `RerunWorkflowAsync(long runId)`

Rerun a completed workflow.

**Parameters:**
- `runId` (long): The workflow run ID

**Returns:** `Task<bool>` (success status)

### `RerunFailedJobsAsync(long runId)`

Rerun only the failed jobs in a workflow.

**Parameters:**
- `runId` (long): The workflow run ID

**Returns:** `Task<bool>` (success status)

### `DeleteWorkflowRunAsync(long runId)`

Delete a workflow run from history.

**Parameters:**
- `runId` (long): The workflow run ID

**Returns:** `Task<bool>` (success status)

### `GetWorkflowRunAttemptsAsync(long runId)`

Get all attempts of a workflow run.

**Parameters:**
- `runId` (long): The workflow run ID

**Returns:** `Task<List<WorkflowRun>>`

## Configuration

### GitHubOptions

Configure these settings in your `appsettings.json`:

```json
{
  "GitHub": {
    "Token": "ghp_xxxxxxxxxxxx",
    "Owner": "The-Nerd-Collective",
    "Repository": "TheNerdCollective.Components"
  }
}
```

### GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token"
3. Select required scopes (recommend `actions`, `repo` for full access)
4. Copy the token and store securely in your configuration

## Models

### WorkflowRun

Represents a GitHub Actions workflow execution with the following key properties:

- `Id`: Unique workflow run identifier
- `Name`: Workflow name
- `Status`: Current status (completed, in_progress, queued, etc.)
- `Conclusion`: Final result (success, failure, cancelled, etc.)
- `Event`: Triggering event type
- `HeadBranch`: Branch where the workflow runs
- `HeadSha`: Commit SHA
- `CreatedAt`: When the run was created
- `UpdatedAt`: Last update timestamp
- `Actor`: User who triggered the workflow
- `HtmlUrl`: GitHub web URL for the run

## Error Handling

The service catches exceptions and returns empty collections or null values:

```csharp
var runs = await _gitHubService.GetLatestWorkflowRunsAsync();
if (!runs.Any())
{
    // Handle empty result (no runs or API error)
}
```

For production use, consider implementing retry logic and logging for failed requests.

## License

Licensed under the Apache License, Version 2.0. See LICENSE file for details.

## Support

For issues or questions, visit the repository:
https://github.com/The-Nerd-Collective/TheNerdCollective.Components
