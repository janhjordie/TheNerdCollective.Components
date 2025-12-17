// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using System.Text.Json.Serialization;

namespace TheNerdCollective.Integrations.Harvest.Models;

/// <summary>
/// Represents a timesheet entry from Harvest API.
/// </summary>
public class TimesheetEntry
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long TaskId { get; set; }
    public long UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string TaskName { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string ExternalReferencePermalink { get; set; } = string.Empty;
    public string ExternalReferenceService { get; set; } = string.Empty;
    public string ExternalReferenceServiceIconUrl { get; set; } = string.Empty;
    public string RawEntryJson { get; set; } = string.Empty;
    public decimal HoursWithoutTimer { get; set; }
    public decimal RoundedHours { get; set; }
    public bool IsLocked { get; set; }
    public string LockedReason { get; set; } = string.Empty;
    public string ApprovalStatus { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
    public bool IsBilled { get; set; }
    public string TimerStartedAt { get; set; } = string.Empty;
    public string StartedTime { get; set; } = string.Empty;
    public string EndedTime { get; set; } = string.Empty;
    public bool IsRunning { get; set; }
    public bool Billable { get; set; }
    public bool Budgeted { get; set; }
    public decimal? BillableRate { get; set; }
    public decimal? CostRate { get; set; }
    public long ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string ClientCurrency { get; set; } = string.Empty;
    public long UserAssignmentId { get; set; }
    public bool? UserAssignmentIsProjectManager { get; set; }
    public bool? UserAssignmentIsActive { get; set; }
    public bool? UserAssignmentUseDefaultRates { get; set; }
    public decimal? UserAssignmentBudget { get; set; }
    public decimal? UserAssignmentHourlyRate { get; set; }
    public DateTime? UserAssignmentCreatedAt { get; set; }
    public DateTime? UserAssignmentUpdatedAt { get; set; }
    public long TaskAssignmentId { get; set; }
    public bool? TaskAssignmentBillable { get; set; }
    public bool? TaskAssignmentIsActive { get; set; }
    public decimal? TaskAssignmentHourlyRate { get; set; }
    public decimal? TaskAssignmentBudget { get; set; }
    public DateTime? TaskAssignmentCreatedAt { get; set; }
    public DateTime? TaskAssignmentUpdatedAt { get; set; }
    public long? InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Hours { get; set; }
    public DateTime SpentDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Harvest API time entry response model.
/// </summary>
public class HarvestTimeEntry
{
    public long Id { get; set; }
    public HarvestUser? User { get; set; }
    public HarvestClient? Client { get; set; }
    public HarvestProject? Project { get; set; }
    public HarvestTask? Task { get; set; }
    public HarvestExternalReference? ExternalReference { get; set; }
    public string? Notes { get; set; }
    public decimal Hours { get; set; }

    [JsonPropertyName("hours_without_timer")]
    public decimal? HoursWithoutTimer { get; set; }

    [JsonPropertyName("rounded_hours")]
    public decimal? RoundedHours { get; set; }

    [JsonPropertyName("is_locked")]
    public bool? IsLocked { get; set; }

    [JsonPropertyName("locked_reason")]
    public string? LockedReason { get; set; }

    [JsonPropertyName("approval_status")]
    public string? ApprovalStatus { get; set; }

    [JsonPropertyName("is_closed")]
    public bool? IsClosed { get; set; }

    [JsonPropertyName("is_billed")]
    public bool? IsBilled { get; set; }

    [JsonPropertyName("timer_started_at")]
    public string? TimerStartedAt { get; set; }

    [JsonPropertyName("started_time")]
    public string? StartedTime { get; set; }

    [JsonPropertyName("ended_time")]
    public string? EndedTime { get; set; }

    [JsonPropertyName("is_running")]
    public bool? IsRunning { get; set; }

    public bool? Billable { get; set; }
    public bool? Budgeted { get; set; }

    [JsonPropertyName("billable_rate")]
    public decimal? BillableRate { get; set; }

    [JsonPropertyName("cost_rate")]
    public decimal? CostRate { get; set; }

    [JsonPropertyName("user_assignment")]
    public HarvestUserAssignment? UserAssignment { get; set; }

    [JsonPropertyName("task_assignment")]
    public HarvestTaskAssignment? TaskAssignment { get; set; }

    public HarvestInvoice? Invoice { get; set; }

    [JsonPropertyName("spent_date")]
    public string? SpentDate { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Harvest user information.
/// </summary>
public class HarvestUser
{
    public long Id { get; set; }
    public string? Name { get; set; }
}

/// <summary>
/// Harvest project information.
/// </summary>
public class HarvestProject
{
    public long Id { get; set; }
    public string? Name { get; set; }
}

/// <summary>
/// Harvest task information.
/// </summary>
public class HarvestTask
{
    public long Id { get; set; }
    public string? Name { get; set; }
}

/// <summary>
/// Harvest client information.
/// </summary>
public class HarvestClient
{
    public long Id { get; set; }
    public string? Name { get; set; }
    public string? Currency { get; set; }
}

/// <summary>
/// Harvest user assignment details.
/// </summary>
public class HarvestUserAssignment
{
    public long Id { get; set; }

    [JsonPropertyName("is_project_manager")]
    public bool? IsProjectManager { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }

    [JsonPropertyName("use_default_rates")]
    public bool? UseDefaultRates { get; set; }

    public decimal? Budget { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime? CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [JsonPropertyName("hourly_rate")]
    public decimal? HourlyRate { get; set; }
}

/// <summary>
/// Harvest task assignment details.
/// </summary>
public class HarvestTaskAssignment
{
    public long Id { get; set; }
    public bool? Billable { get; set; }

    [JsonPropertyName("is_active")]
    public bool? IsActive { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime? CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [JsonPropertyName("hourly_rate")]
    public decimal? HourlyRate { get; set; }

    public decimal? Budget { get; set; }
}

/// <summary>
/// Harvest invoice information (when present).
/// </summary>
public class HarvestInvoice
{
    public long Id { get; set; }
    public string? Number { get; set; }
}

/// <summary>
/// Harvest external reference information (e.g., Trello card link).
/// </summary>
public class HarvestExternalReference
{
    public string? Id { get; set; }

    [JsonPropertyName("group_id")]
    public string? GroupId { get; set; }

    public string? Service { get; set; }
    public string? Permalink { get; set; }

    [JsonPropertyName("service_icon_url")]
    public string? ServiceIconUrl { get; set; }
}

/// <summary>
/// Response wrapper for time entries.
/// </summary>
public class HarvestTimeEntriesResponse
{
    [JsonPropertyName("time_entries")]
    public List<HarvestTimeEntry>? TimeEntries { get; set; }
}

/// <summary>
/// Response wrapper for projects.
/// </summary>
public class HarvestProjectsResponse
{
    [JsonPropertyName("projects")]
    public List<HarvestProject>? Projects { get; set; }
}
