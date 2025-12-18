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
    private DateTime? SelectedDate = DateTime.Now;
    private bool IsLoading = false;
    private readonly List<long> _appliedProjectIds = new();
    private bool _hasInitialized;
    private bool _passwordVerified = false;
    private string _passwordInput = string.Empty;
    private bool _passwordIncorrect = false;

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

        try
        {
            var date = SelectedDate.Value;
            var firstDay = new DateTime(date.Year, date.Month, 1);
            var lastDay = firstDay.AddMonths(1).AddDays(-1);

            Timesheets = await HarvestService.GetTimesheetEntriesAsync(firstDay, lastDay);
        }
        catch
        {
            // Error handling can be extended here
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

    private decimal TotalHours => Timesheets.Sum(t => t.Hours);

    private decimal UnbilledHours => Timesheets
        .Where(t => t.TaskName?.Contains(UnbilledKeyword) ?? false)
        .Sum(t => t.Hours);

    private decimal BillableHours => TotalHours - UnbilledHours;

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

        if (_passwordInput == HarvestOptions.Value.Password)
        {
            _passwordVerified = true;
            ApplyProjectIdsOverride();
            await LoadTimesheets();
            _passwordInput = string.Empty;
        }
        else
        {
            _passwordIncorrect = true;
        }
    }

    private async Task HandlePasswordKeyDown(KeyboardEventArgs args)
    {
        if (args.Key == "Enter")
        {
            await VerifyPassword();
        }
    }
}
