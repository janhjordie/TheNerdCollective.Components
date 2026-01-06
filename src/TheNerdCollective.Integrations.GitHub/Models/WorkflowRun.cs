// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using System.Text.Json.Serialization;

namespace TheNerdCollective.Integrations.GitHub.Models;

/// <summary>
/// Represents a GitHub Actions workflow run.
/// https://docs.github.com/en/rest/reference/actions#list-workflow-runs
/// </summary>
public class WorkflowRun
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("node_id")]
    public string NodeId { get; set; } = string.Empty;

    [JsonPropertyName("head_branch")]
    public string HeadBranch { get; set; } = string.Empty;

    [JsonPropertyName("head_sha")]
    public string HeadSha { get; set; } = string.Empty;

    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;

    [JsonPropertyName("display_title")]
    public string DisplayTitle { get; set; } = string.Empty;

    [JsonPropertyName("run_number")]
    public int RunNumber { get; set; }

    [JsonPropertyName("event")]
    public string Event { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("conclusion")]
    public string? Conclusion { get; set; }

    [JsonPropertyName("workflow_id")]
    public long WorkflowId { get; set; }

    [JsonPropertyName("check_suite_id")]
    public long CheckSuiteId { get; set; }

    [JsonPropertyName("check_suite_node_id")]
    public string CheckSuiteNodeId { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; set; } = string.Empty;

    [JsonPropertyName("pull_requests")]
    public List<PullRequest> PullRequests { get; set; } = new();

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("actor")]
    public Actor? Actor { get; set; }

    [JsonPropertyName("run_attempt")]
    public int RunAttempt { get; set; }

    [JsonPropertyName("referenced_workflows")]
    public List<ReferencedWorkflow> ReferencedWorkflows { get; set; } = new();

    [JsonPropertyName("run_started_at")]
    public DateTime? RunStartedAt { get; set; }

    [JsonPropertyName("jobs_url")]
    public string JobsUrl { get; set; } = string.Empty;

    [JsonPropertyName("logs_url")]
    public string LogsUrl { get; set; } = string.Empty;

    [JsonPropertyName("check_runs_url")]
    public string CheckRunsUrl { get; set; } = string.Empty;

    [JsonPropertyName("artifacts_url")]
    public string ArtifactsUrl { get; set; } = string.Empty;

    [JsonPropertyName("cancel_url")]
    public string CancelUrl { get; set; } = string.Empty;

    [JsonPropertyName("rerun_url")]
    public string RerunUrl { get; set; } = string.Empty;

    [JsonPropertyName("previous_attempt_url")]
    public string? PreviousAttemptUrl { get; set; }

    [JsonPropertyName("workflow_url")]
    public string WorkflowUrl { get; set; } = string.Empty;

    [JsonPropertyName("head_commit")]
    public HeadCommit? HeadCommit { get; set; }

    [JsonPropertyName("repository")]
    public Repository? Repository { get; set; }

    [JsonPropertyName("head_repository")]
    public Repository? HeadRepository { get; set; }

    [JsonPropertyName("triggering_actor")]
    public Actor? TriggeringActor { get; set; }
}

/// <summary>
/// Represents a pull request associated with a workflow run.
/// </summary>
public class PullRequest
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("number")]
    public int Number { get; set; }

    [JsonPropertyName("head")]
    public PullRequestHead? Head { get; set; }

    [JsonPropertyName("base")]
    public PullRequestBase? Base { get; set; }
}

/// <summary>
/// Represents the head of a pull request.
/// </summary>
public class PullRequestHead
{
    [JsonPropertyName("ref")]
    public string Ref { get; set; } = string.Empty;

    [JsonPropertyName("sha")]
    public string Sha { get; set; } = string.Empty;
}

/// <summary>
/// Represents the base of a pull request.
/// </summary>
public class PullRequestBase
{
    [JsonPropertyName("ref")]
    public string Ref { get; set; } = string.Empty;

    [JsonPropertyName("sha")]
    public string Sha { get; set; } = string.Empty;
}

/// <summary>
/// Represents a GitHub actor (user or app).
/// </summary>
public class Actor
{
    [JsonPropertyName("login")]
    public string Login { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("node_id")]
    public string NodeId { get; set; } = string.Empty;

    [JsonPropertyName("avatar_url")]
    public string AvatarUrl { get; set; } = string.Empty;

    [JsonPropertyName("gravatar_id")]
    public string GravatarId { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; set; } = string.Empty;

    [JsonPropertyName("followers_url")]
    public string FollowersUrl { get; set; } = string.Empty;

    [JsonPropertyName("following_url")]
    public string FollowingUrl { get; set; } = string.Empty;

    [JsonPropertyName("gists_url")]
    public string GistsUrl { get; set; } = string.Empty;

    [JsonPropertyName("starred_url")]
    public string StarredUrl { get; set; } = string.Empty;

    [JsonPropertyName("subscriptions_url")]
    public string SubscriptionsUrl { get; set; } = string.Empty;

    [JsonPropertyName("organizations_url")]
    public string OrganizationsUrl { get; set; } = string.Empty;

    [JsonPropertyName("repos_url")]
    public string ReposUrl { get; set; } = string.Empty;

    [JsonPropertyName("events_url")]
    public string EventsUrl { get; set; } = string.Empty;

    [JsonPropertyName("received_events_url")]
    public string ReceivedEventsUrl { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("site_admin")]
    public bool SiteAdmin { get; set; }
}

/// <summary>
/// Represents a referenced workflow.
/// </summary>
public class ReferencedWorkflow
{
    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;

    [JsonPropertyName("sha")]
    public string Sha { get; set; } = string.Empty;

    [JsonPropertyName("ref")]
    public string? Ref { get; set; }
}

/// <summary>
/// Represents a repository.
/// </summary>
public class Repository
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("node_id")]
    public string NodeId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("owner")]
    public Owner? Owner { get; set; }

    [JsonPropertyName("private")]
    public bool Private { get; set; }

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("fork")]
    public bool Fork { get; set; }

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("pushed_at")]
    public DateTime PushedAt { get; set; }
}

/// <summary>
/// Represents a repository owner.
/// </summary>
public class Owner
{
    [JsonPropertyName("login")]
    public string Login { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("node_id")]
    public string NodeId { get; set; } = string.Empty;

    [JsonPropertyName("avatar_url")]
    public string AvatarUrl { get; set; } = string.Empty;

    [JsonPropertyName("gravatar_id")]
    public string GravatarId { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("site_admin")]
    public bool SiteAdmin { get; set; }
}

/// <summary>
/// Represents the head commit of a workflow run.
/// </summary>
public class HeadCommit
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("tree_id")]
    public string TreeId { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("author")]
    public CommitAuthor? Author { get; set; }

    [JsonPropertyName("committer")]
    public CommitAuthor? Committer { get; set; }
}

/// <summary>
/// Represents a commit author or committer.
/// </summary>
public class CommitAuthor
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}
