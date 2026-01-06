# TheNerdCollective.Integrations.AzurePipelines

A comprehensive .NET integration library for the Azure Pipelines REST API, providing seamless access to pipeline management, monitoring, and run execution.

## Features

- **Pipeline Management**: List and retrieve pipeline definitions
- **Run Monitoring**: Fetch and filter pipeline runs with various criteria
- **Run Control**: Queue new runs, cancel in-progress runs
- **Advanced Filtering**: Filter by status, result, branch, and pipeline ID
- **Variable Support**: Pass variables when queuing pipeline runs
- **Async/Await Support**: Fully asynchronous API for high-performance applications
- **Configurable**: Easy setup with dependency injection and configuration

## Installation

```bash
dotnet add package TheNerdCollective.Integrations.AzurePipelines
```

## Quick Start

### 1. Configure in `appsettings.json`

```json
{
  "AzurePipelines": {
    "Token": "your_personal_access_token",
    "Organization": "your-org",
    "Project": "your-project",
    "ApiVersion": "7.0"
  }
}
```

### 2. Register in Dependency Injection (Program.cs)

```csharp
builder.Services.Configure<AzurePipelinesOptions>(
    builder.Configuration.GetSection("AzurePipelines"));
builder.Services.AddHttpClient<AzurePipelinesService>();
```

### 3. Use the Service

```csharp
public class MyService
{
    private readonly AzurePipelinesService _pipelinesService;

    public MyService(AzurePipelinesService pipelinesService)
    {
        _pipelinesService = pipelinesService;
    }

    public async Task CheckPipelineRuns()
    {
        // Get latest 10 pipeline runs
        var runs = await _pipelinesService.GetLatestPipelineRunsAsync(limit: 10);

        foreach (var run in runs)
        {
            Console.WriteLine($"{run.Name}: {run.State} - {run.Result}");
        }
    }

    public async Task GetFailedRuns()
    {
        // Get failed pipeline runs
        var failedRuns = await _pipelinesService.GetPipelineRunsAsync(
            limit: 20,
            resultFilter: "failed"
        );

        return failedRuns;
    }

    public async Task QueueNewRun(int pipelineId)
    {
        var variables = new Dictionary<string, string>
        {
            { "BuildConfiguration", "Release" },
            { "BuildPlatform", "x64" }
        };

        var run = await _pipelinesService.QueuePipelineRunAsync(
            pipelineId,
            sourceBranch: "refs/heads/main",
            variables: variables
        );

        if (run != null)
        {
            Console.WriteLine($"Queued run {run.Id}: {run.Name}");
        }
    }

    public async Task CancelRun(int pipelineId, int runId)
    {
        var success = await _pipelinesService.CancelPipelineRunAsync(pipelineId, runId);
        return success;
    }
}
```

## API Reference

### `GetLatestPipelineRunsAsync(int limit, string? statusFilter, string? resultFilter)`

Retrieve the latest pipeline runs with optional filtering.

**Parameters:**
- `limit` (int, default: 10): Maximum runs to retrieve
- `statusFilter` (string, optional): Filter by state (inProgress, completed, cancelling, postponed, notStarted)
- `resultFilter` (string, optional): Filter by result (succeeded, partiallySucceeded, failed, canceled)

**Returns:** `Task<List<PipelineRun>>`

### `GetPipelineRunsAsync(int limit, string? statusFilter, string? resultFilter, int? pipelineId, string? branch, string? orderBy)`

Advanced filtering for pipeline runs.

**Parameters:**
- `limit` (int, default: 10): Maximum runs to retrieve
- `statusFilter`, `resultFilter`: Standard filters
- `pipelineId` (int, optional): Filter by specific pipeline
- `branch` (string, optional): Filter by source branch
- `orderBy` (string, optional): Sort order

**Returns:** `Task<List<PipelineRun>>`

### `GetPipelineRunAsync(int pipelineId, int runId)`

Get details of a specific pipeline run.

**Parameters:**
- `pipelineId` (int): The pipeline ID
- `runId` (int): The run ID

**Returns:** `Task<PipelineRun?>`

### `QueuePipelineRunAsync(int pipelineId, string? sourceBranch, Dictionary<string, string>? variables)`

Queue a new pipeline run (trigger a build).

**Parameters:**
- `pipelineId` (int): The pipeline ID to queue
- `sourceBranch` (string, optional): Source branch (e.g., "refs/heads/main")
- `variables` (Dictionary, optional): Pipeline variables to pass

**Returns:** `Task<PipelineRun?>` (the queued run, or null on failure)

### `CancelPipelineRunAsync(int pipelineId, int runId)`

Cancel an in-progress pipeline run.

**Parameters:**
- `pipelineId` (int): The pipeline ID
- `runId` (int): The run ID

**Returns:** `Task<bool>` (success status)

### `GetPipelinesAsync(int limit)`

Get all pipelines in the project.

**Parameters:**
- `limit` (int, default: 100): Maximum pipelines to retrieve

**Returns:** `Task<List<Pipeline>>`

### `GetPipelineAsync(int pipelineId)`

Get details of a specific pipeline.

**Parameters:**
- `pipelineId` (int): The pipeline ID

**Returns:** `Task<Pipeline?>`

## Configuration

### AzurePipelinesOptions

Configure these settings in your `appsettings.json`:

```json
{
  "AzurePipelines": {
    "Token": "your_pat_token_here",
    "Organization": "your-org",
    "Project": "your-project",
    "ApiVersion": "7.0"
  }
}
```

### Personal Access Token (PAT)

1. Go to https://dev.azure.com/{your-org}/_usersSettings/tokens
2. Click "New Token"
3. Select scopes:
   - Build (Read & Execute)
   - Code (Read)
4. Copy the token and store securely in your configuration

## Models

### PipelineRun

Represents a pipeline execution with the following key properties:

- `Id`: Unique run identifier
- `Name`: Run name
- `State`: Current state (inProgress, completed, cancelling, postponed, notStarted)
- `Result`: Final result (succeeded, partiallySucceeded, failed, canceled)
- `CreatedDate`: When the run was created
- `FinishedDate`: When the run completed (null if still running)
- `SourceBranch`: Branch where the run executes
- `SourceVersion`: Commit SHA
- `TriggeredBy`: User who triggered the run
- `HtmlUrl`: Azure DevOps web URL for the run
- `Resources`: Repository, container, and package resources
- `Variables`: Pipeline variables used in the run

### Pipeline

Represents a pipeline definition with properties:

- `Id`: Pipeline identifier
- `Name`: Pipeline name
- `Folder`: Pipeline folder path
- `Url`: API URL for the pipeline

## Error Handling

The service catches exceptions and returns empty collections or null values:

```csharp
var runs = await _pipelinesService.GetLatestPipelineRunsAsync();
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
