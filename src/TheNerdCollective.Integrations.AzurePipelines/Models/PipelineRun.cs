// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using System.Text.Json.Serialization;

namespace TheNerdCollective.Integrations.AzurePipelines.Models;

/// <summary>
/// Represents an Azure Pipelines run.
/// https://docs.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/list
/// </summary>
public class PipelineRun
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("htmlUrl")]
    public string HtmlUrl { get; set; } = string.Empty;

    [JsonPropertyName("pipeline")]
    public Pipeline? Pipeline { get; set; }

    [JsonPropertyName("state")]
    public string State { get; set; } = string.Empty;

    [JsonPropertyName("result")]
    public string? Result { get; set; }

    [JsonPropertyName("createdDate")]
    public DateTime CreatedDate { get; set; }

    [JsonPropertyName("finishedDate")]
    public DateTime? FinishedDate { get; set; }

    [JsonPropertyName("sourceBranch")]
    public string SourceBranch { get; set; } = string.Empty;

    [JsonPropertyName("sourceVersion")]
    public string SourceVersion { get; set; } = string.Empty;

    [JsonPropertyName("draft")]
    public bool Draft { get; set; }

    [JsonPropertyName("triggeredBy")]
    public IdentityRef? TriggeredBy { get; set; }

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;

    [JsonPropertyName("resources")]
    public PipelineRunResources? Resources { get; set; }

    [JsonPropertyName("variables")]
    public Dictionary<string, VariableValue> Variables { get; set; } = new();
}

/// <summary>
/// Represents a pipeline definition.
/// </summary>
public class Pipeline
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("revision")]
    public int Revision { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("folder")]
    public string Folder { get; set; } = string.Empty;
}

/// <summary>
/// Represents a pipeline run variable.
/// </summary>
public class VariableValue
{
    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    [JsonPropertyName("isSecret")]
    public bool IsSecret { get; set; }
}

/// <summary>
/// Represents pipeline run resources.
/// </summary>
public class PipelineRunResources
{
    [JsonPropertyName("repositories")]
    public Dictionary<string, RepositoryResource> Repositories { get; set; } = new();

    [JsonPropertyName("containers")]
    public List<ContainerResource> Containers { get; set; } = new();

    [JsonPropertyName("packages")]
    public List<PackageResource> Packages { get; set; } = new();
}

/// <summary>
/// Represents a repository resource.
/// </summary>
public class RepositoryResource
{
    [JsonPropertyName("repository")]
    public RepositoryReference? Repository { get; set; }

    [JsonPropertyName("refName")]
    public string RefName { get; set; } = string.Empty;

    [JsonPropertyName("committedDate")]
    public DateTime CommittedDate { get; set; }

    [JsonPropertyName("commitMessage")]
    public string CommitMessage { get; set; } = string.Empty;
}

/// <summary>
/// Represents a repository reference.
/// </summary>
public class RepositoryReference
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

/// <summary>
/// Represents a container resource.
/// </summary>
public class ContainerResource
{
    [JsonPropertyName("alias")]
    public string Alias { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("uri")]
    public string Uri { get; set; } = string.Empty;
}

/// <summary>
/// Represents a package resource.
/// </summary>
public class PackageResource
{
    [JsonPropertyName("alias")]
    public string Alias { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
}

/// <summary>
/// Represents an identity reference.
/// </summary>
public class IdentityRef
{
    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("_links")]
    public Links? Links { get; set; }

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("uniqueName")]
    public string UniqueName { get; set; } = string.Empty;

    [JsonPropertyName("imageUrl")]
    public string ImageUrl { get; set; } = string.Empty;

    [JsonPropertyName("descriptor")]
    public string Descriptor { get; set; } = string.Empty;
}

/// <summary>
/// Represents API links.
/// </summary>
public class Links
{
    [JsonPropertyName("self")]
    public Link? Self { get; set; }

    [JsonPropertyName("avatar")]
    public Link? Avatar { get; set; }
}

/// <summary>
/// Represents a single link.
/// </summary>
public class Link
{
    [JsonPropertyName("href")]
    public string Href { get; set; } = string.Empty;
}
