// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.Options;
using TheNerdCollective.Integrations.Harvest;
using TheNerdCollective.Integrations.Harvest.Models;

namespace TheNerdCollective.MudComponents.HarvestTimesheet;

/// <summary>
/// A Blazor component for displaying timesheet entries from Harvest API.
/// </summary>
public partial class TimesheetDisplay : ComponentBase
{
    [Inject] private HarvestService HarvestService { get; set; } = null!;
    [Inject] private IOptions<HarvestOptions> HarvestOptions { get; set; } = null!;

    private List<TimesheetEntry> Timesheets = new();
    private List<string> AvailableProjects = new();
    private IEnumerable<string> _selectedProjects = new List<string>();
    private DateTime? SelectedDate = DateTime.Now;
    private bool IsLoading = false;
    private readonly List<long> _appliedProjectIds = new();
    private bool _hasInitialized;
    private bool _passwordVerified = false;
    private string _passwordInput = string.Empty;
    private bool _passwordIncorrect = false;
    private string? _harvestError = null;

    /// <summary>
    /// Gets or sets the date to display timesheets for. Defaults to current month.
    /// </summary>
    [Parameter]
    public DateTime? InitialDate { get; set; }

    /// <summary>
    /// Gets or sets the keyword used to identify unbilled/unpaid hours in task names.
    /// Default is "(U/B)".
    /// </summary>
    [Parameter]
    public string UnbilledKeyword { get; set; } = "(U/B)";

    /// <summary>
    /// Optional project IDs to load timesheets for. When provided, overrides appsettings configuration.
    /// Format: comma-separated list of project IDs (e.g., "123456,789012")
    /// </summary>
    [Parameter]
    public string? ProjectIds { get; set; }

    /// <summary>
    /// Gets or sets whether to show the debug panel with raw Harvest JSON data.
    /// Default is false.
    /// </summary>
    [Parameter]
    public bool ShowDebugPanel { get; set; } = false;

    /// <summary>
    /// Gets or sets the minute interval to round hours up to.
    /// Default is 15 minutes.
    /// </summary>
    [Parameter]
    public int MinutesRoundInterval { get; set; } = 15;

    protected override async Task OnInitializedAsync()
    {
        var now = InitialDate ?? DateTime.Now;
        SelectedDate = new DateTime(now.Year, now.Month, 1);

        // Check if password protection is enabled
        if (string.IsNullOrEmpty(HarvestOptions.Value.Password))
        {
            _passwordVerified = true;
            ApplyProjectIdsOverride();
            await LoadTimesheets();
        }

        _hasInitialized = true;
    }

    protected override Task OnParametersSetAsync()
    {
        if (!_hasInitialized)
        {
            return base.OnParametersSetAsync();
        }

        var projectIdsChanged = ApplyProjectIdsOverride();
        if (projectIdsChanged && SelectedDate.HasValue)
        {
            return LoadTimesheets();
        }

        return base.OnParametersSetAsync();
    }

    private async Task LoadTimesheets()
    {
        if (!SelectedDate.HasValue)
        {
            return;
        }

        IsLoading = true;
        _harvestError = null;

        try
        {
            var date = SelectedDate.Value;
            var firstDay = new DateTime(date.Year, date.Month, 1);
            var lastDay = firstDay.AddMonths(1).AddDays(-1);

            Timesheets = await HarvestService.GetTimesheetEntriesAsync(firstDay, lastDay);
            
            // Extract unique projects and select all by default
            AvailableProjects = Timesheets
                .Select(t => t.ProjectName)
                .Where(p => !string.IsNullOrEmpty(p))
                .Distinct()
                .OrderBy(p => p)
                .ToList();
            
            // Select all projects by default
            _selectedProjects = new List<string>(AvailableProjects);
        }
        catch (Exception ex)
        {
            _harvestError = $"Error loading timesheets: {ex.GetType().Name}\n{ex.Message}\n\nStack Trace:\n{ex.StackTrace}";
            ShowDebugPanel = true;
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task PreviousMonth()
    {
        if (SelectedDate.HasValue)
        {
            SelectedDate = SelectedDate.Value.AddMonths(-1);
            await LoadTimesheets();
        }
    }

    private async Task NextMonth()
    {
        if (SelectedDate.HasValue)
        {
            SelectedDate = SelectedDate.Value.AddMonths(1);
            await LoadTimesheets();
        }
    }

    private decimal TotalHours => RoundHoursToInterval(Timesheets.Sum(t => t.Hours));

    private decimal UnbilledHours => RoundHoursToInterval(Timesheets
        .Where(t => t.TaskName?.Contains(UnbilledKeyword) ?? false)
        .Sum(t => t.Hours));

    private decimal BillableHours => TotalHours - UnbilledHours;

    private List<TimesheetEntry> FilteredTimesheets => Timesheets
        .Where(t => _selectedProjects.Contains(t.ProjectName ?? string.Empty))
        .ToList();

    private decimal GetFilteredTotalHours() => RoundHoursToInterval(FilteredTimesheets.Sum(t => t.Hours));

    private decimal GetFilteredUnbilledHours() => RoundHoursToInterval(FilteredTimesheets
        .Where(t => t.TaskName?.Contains(UnbilledKeyword) ?? false)
        .Sum(t => t.Hours));

    private decimal GetFilteredBillableHours() => GetFilteredTotalHours() - GetFilteredUnbilledHours();

    private string GetProjectsDisplayText(List<string> selected)
    {
        return selected.Count switch
        {
            0 => "No projects selected",
            1 => selected[0],
            _ => $"{selected.Count} projects selected"
        };
    }

    private decimal RoundHoursToInterval(decimal hours)
    {
        var minutes = hours * 60;
        var roundedMinutes = Math.Ceiling(minutes / MinutesRoundInterval) * MinutesRoundInterval;
        return roundedMinutes / 60;
    }

    private static bool IsTrelloExternal(TimesheetEntry entry)
    {
        return (entry.ExternalReferenceService?.IndexOf("trello", StringComparison.OrdinalIgnoreCase) ?? -1) >= 0;
    }

    private bool ApplyProjectIdsOverride()
    {
        if (string.IsNullOrWhiteSpace(ProjectIds))
        {
            return false;
        }

        var incoming = ProjectIds
            .Split(',', System.StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .Where(s => long.TryParse(s, out _))
            .Select(long.Parse)
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (incoming.Count == 0)
        {
            return false;
        }

        if (_appliedProjectIds.SequenceEqual(incoming))
        {
            return false;
        }

        HarvestService.ClearProjectIds();
        foreach (var id in incoming)
        {
            HarvestService.AddProjectId(id);
        }

        _appliedProjectIds.Clear();
        _appliedProjectIds.AddRange(incoming);

        return true;
    }

    private async Task VerifyPassword()
    {
        _passwordIncorrect = false;

        // Ensure we have the password value
        var expectedPassword = HarvestOptions.Value.Password;
        if (string.IsNullOrEmpty(expectedPassword))
        {
            _passwordVerified = true;
            ApplyProjectIdsOverride();
            await LoadTimesheets();
            return;
        }

        if (_passwordInput == expectedPassword)
        {
            _passwordVerified = true;
            ApplyProjectIdsOverride();
            await LoadTimesheets();
            _passwordInput = string.Empty;
            StateHasChanged();
        }
        else
        {
            _passwordIncorrect = true;
            StateHasChanged();
        }
    }

    private async Task HandlePasswordKeyUp(KeyboardEventArgs args)
    {
        if (args.Key == "Enter")
        {
            // With Immediate=true and DebounceInterval=0, value is already updated
            await VerifyPassword();
        }
    }
}
