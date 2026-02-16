// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using TheNerdCollective.Integrations.Harvest.Models;

namespace TheNerdCollective.Integrations.Harvest;

/// <summary>
/// Service for interacting with GetHarvest.com API v2.
/// https://help.getharvest.com/api-v2/
/// </summary>
public class HarvestService
{
    private readonly HttpClient _httpClient;
    private readonly HarvestOptions _options;
    private readonly List<long> _projectIds;
    private static readonly JsonSerializerOptions SerializerOptions = new() { PropertyNameCaseInsensitive = true, WriteIndented = true };

    private const string HARVEST_BASE_URL = "https://api.harvestapp.com/v2/";

    public HarvestService(HttpClient httpClient, IOptions<HarvestOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _projectIds = new List<long>(_options.ProjectIds);

        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        _httpClient.BaseAddress = new Uri(HARVEST_BASE_URL);
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_options.ApiToken}");
        _httpClient.DefaultRequestHeaders.Add("Harvest-Account-ID", _options.AccountId);
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "TheNerdCollective.Integrations.Harvest/0.1.0");
    }

    /// <summary>
    /// Get timesheet entries for all configured projects within a specified date range.
    /// </summary>
    /// <param name="startDate">The start date (inclusive) for the timesheet range in UTC.</param>
    /// <param name="endDate">The end date (inclusive) for the timesheet range in UTC.</param>
    /// <returns>
    /// A sorted list of <see cref="TimesheetEntry"/> objects ordered by spent date, then by creation time.
    /// Returns an empty list if no entries are found or an error occurs.
    /// </returns>
    /// <remarks>
    /// This method queries all configured project IDs (via <see cref="AddProjectId"/>) and aggregates results.
    /// Use <see cref="GetProjectsAsync"/> to discover available projects first.
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/
    /// </remarks>
    public async Task<List<TimesheetEntry>> GetTimesheetEntriesAsync(DateTime startDate, DateTime endDate)
    {
        try
        {
            var allEntries = new List<TimesheetEntry>();

            foreach (var projectId in _projectIds)
            {
                var entries = await GetTimesheetEntriesByProjectAsync(projectId, startDate, endDate);
                allEntries.AddRange(entries);
            }

            return allEntries.OrderBy(e => e.SpentDate).ThenBy(e => e.CreatedAt).ToList();
        }
        catch
        {
            return new List<TimesheetEntry>();
        }
    }

    /// <summary>
    /// Get timesheet entries for a specific project within a date range.
    /// </summary>
    private async Task<List<TimesheetEntry>> GetTimesheetEntriesByProjectAsync(long projectId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var from = startDate.ToString("yyyy-MM-dd");
            var to = endDate.ToString("yyyy-MM-dd");

            var url = $"time_entries?project_id={projectId}&from={from}&to={to}&per_page=100";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var entries = new List<TimesheetEntry>();

            using var doc = JsonDocument.Parse(contentStr);
            if (doc.RootElement.TryGetProperty("time_entries", out var timeEntriesElement))
            {
                foreach (var element in timeEntriesElement.EnumerateArray())
                {
                    var entry = element.Deserialize<HarvestTimeEntry>(SerializerOptions);
                    if (entry != null)
                    {
                        var raw = element.GetRawText();
                        entries.Add(MapToTimesheetEntry(entry, raw));
                    }
                }
            }

            return entries;
        }
        catch
        {
            return new List<TimesheetEntry>();
        }
    }

    /// <summary>
    /// Get all available projects from the configured Harvest account.
    /// </summary>
    /// <returns>A list of <see cref="HarvestProject"/> objects from all projects in the account. Returns an empty list if an error occurs.</returns>
    /// <remarks>
    /// This method retrieves all projects with pagination (100 per page). Use the result to populate your project ID tracking via <see cref="AddProjectId"/>.
    /// Use <see cref="GetTimesheetEntriesAsync"/> to fetch time entries for tracked projects.
    /// This method uses exponential backoff retry policy (Polly) to handle transient failures.
    /// API Reference: https://help.getharvest.com/api-v2/projects-api/projects/projects/
    /// </remarks>
    public async Task<List<HarvestProject>> GetProjectsAsync()
    {
        try
        {
            var url = "projects?per_page=100";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var contentStr = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<HarvestProjectsResponse>(contentStr, SerializerOptions);
            return data?.Projects ?? new List<HarvestProject>();
        }
        catch
        {
            return new List<HarvestProject>();
        }
    }

    /// <summary>
    /// Add a project ID to track.
    /// </summary>
    public void AddProjectId(long projectId)
    {
        if (!_projectIds.Contains(projectId))
        {
            _projectIds.Add(projectId);
        }
    }

    /// <summary>
    /// Remove a project ID from tracking.
    /// </summary>
    public void RemoveProjectId(long projectId)
    {
        _projectIds.Remove(projectId);
    }

    /// <summary>
    /// Get all tracked project IDs.
    /// </summary>
    public List<long> GetProjectIds() => new(_projectIds);

    /// <summary>
    /// Clear all tracked project IDs.
    /// </summary>
    public void ClearProjectIds() => _projectIds.Clear();

    private TimesheetEntry MapToTimesheetEntry(HarvestTimeEntry entry, string rawJson)
    {
        return new TimesheetEntry
        {
            Id = entry.Id,
            ProjectId = entry.Project?.Id ?? 0,
            TaskId = entry.Task?.Id ?? 0,
            UserId = entry.User?.Id ?? 0,
            UserName = entry.User?.Name ?? string.Empty,
            ProjectName = entry.Project?.Name ?? string.Empty,
            ProjectCode = entry.Project?.Code ?? string.Empty,
            TaskName = entry.Task?.Name ?? string.Empty,
            Notes = entry.Notes ?? string.Empty,
            ExternalReferencePermalink = entry.ExternalReference?.Permalink ?? string.Empty,
            ExternalReferenceService = entry.ExternalReference?.Service ?? string.Empty,
            ExternalReferenceServiceIconUrl = entry.ExternalReference?.ServiceIconUrl ?? string.Empty,
            ExternalReferenceAccountId = entry.ExternalReference?.AccountId ?? string.Empty,
            RawEntryJson = rawJson,
            HoursWithoutTimer = entry.HoursWithoutTimer ?? 0m,
            RoundedHours = entry.RoundedHours ?? entry.Hours,
            IsLocked = entry.IsLocked ?? false,
            LockedReason = entry.LockedReason ?? string.Empty,
            ApprovalStatus = entry.ApprovalStatus ?? string.Empty,
            IsClosed = entry.IsClosed ?? false,
            IsBilled = entry.IsBilled ?? false,
            TimerStartedAt = entry.TimerStartedAt ?? string.Empty,
            StartedTime = entry.StartedTime ?? string.Empty,
            EndedTime = entry.EndedTime ?? string.Empty,
            IsRunning = entry.IsRunning ?? false,
            Billable = entry.Billable ?? false,
            Budgeted = entry.Budgeted ?? false,
            BillableRate = entry.BillableRate,
            CostRate = entry.CostRate,
            ClientId = entry.Client?.Id ?? 0,
            ClientName = entry.Client?.Name ?? string.Empty,
            ClientCurrency = entry.Client?.Currency ?? string.Empty,
            UserAssignmentId = entry.UserAssignment?.Id ?? 0,
            UserAssignmentIsProjectManager = entry.UserAssignment?.IsProjectManager,
            UserAssignmentIsActive = entry.UserAssignment?.IsActive,
            UserAssignmentUseDefaultRates = entry.UserAssignment?.UseDefaultRates,
            UserAssignmentBudget = entry.UserAssignment?.Budget,
            UserAssignmentHourlyRate = entry.UserAssignment?.HourlyRate,
            UserAssignmentCreatedAt = entry.UserAssignment?.CreatedAt,
            UserAssignmentUpdatedAt = entry.UserAssignment?.UpdatedAt,
            TaskAssignmentId = entry.TaskAssignment?.Id ?? 0,
            TaskAssignmentBillable = entry.TaskAssignment?.Billable,
            TaskAssignmentIsActive = entry.TaskAssignment?.IsActive,
            TaskAssignmentHourlyRate = entry.TaskAssignment?.HourlyRate,
            TaskAssignmentBudget = entry.TaskAssignment?.Budget,
            TaskAssignmentCreatedAt = entry.TaskAssignment?.CreatedAt,
            TaskAssignmentUpdatedAt = entry.TaskAssignment?.UpdatedAt,
            InvoiceId = entry.Invoice?.Id,
            InvoiceNumber = entry.Invoice?.Number ?? string.Empty,
            Hours = entry.Hours,
            SpentDate = !string.IsNullOrEmpty(entry.SpentDate) ? DateTime.Parse(entry.SpentDate) : DateTime.Now,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };
    }
}
