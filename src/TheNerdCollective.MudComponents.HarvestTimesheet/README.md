# TheNerdCollective.MudComponents.HarvestTimesheet

A MudBlazor component for displaying and managing timesheet entries from the GetHarvest API.

## Overview

TheNerdCollective.MudComponents.HarvestTimesheet provides a beautiful, interactive Blazor component that displays timesheet data with month navigation, hourly summaries, and billable vs. unbilled hour tracking.

## Quick Start

### Installation

```bash
dotnet add package TheNerdCollective.MudComponents.HarvestTimesheet
```

### Setup

1. **Add Script Reference** in `App.razor` (if using MudBlazor):
```html
<head>
    <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/@fontsource/roboto@4.5.0/index.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/mudc@latest/dist/mudc.min.css" rel="stylesheet" />
</head>
```

2. **Configure Harvest Integration** in `appsettings.json` (required):

Basic configuration with project IDs and no password protection:
```json
{
  "Harvest": {
    "ApiToken": "your_api_token",
    "AccountId": "your_account_id",
    "ProjectIds": [123456, 789012]
  }
}
```

With optional password protection:
```json
{
  "Harvest": {
    "ApiToken": "your_api_token",
    "AccountId": "your_account_id",
    "ProjectIds": [123456, 789012],
    "Password": "your_secure_password"
  }
}
```

Configuration reference:
- **ApiToken** (required): Get from https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/
- **AccountId** (required): Found in your Harvest account settings
- **ProjectIds** (optional): List of project IDs to track. Can be overridden per component with the `ProjectIds` parameter
- **Password** (optional): Leave empty/null to disable password protection. When set, users must enter this password to view timesheets

3. **Register Services** in Program.cs:
```csharp
using MudBlazor.Services;
using TheNerdCollective.Integrations.Harvest.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMudServices();
builder.Services.AddHarvestIntegration(builder.Configuration);

var app = builder.Build();
```

4. **Use the Component**:
```razor
@page "/timesheets"
@using TheNerdCollective.MudComponents.HarvestTimesheet

<TimesheetDisplay />
```

## Features

- **Month Navigation** - Navigate between months to view different timesheet periods
- **Entry Details** - View dates, projects, tasks, users, notes, and linked Trello cards
- **Billable Tracking** - Automatically separates billable and unbilled hours
- **Hour Summaries** - Displays total hours, billable hours, and unbilled hours
- **Password Protection** - Optional password protection for sensitive timesheet data (configurable via appsettings)
- **Responsive Design** - Adapts to mobile, tablet, and desktop screens
- **Loading States** - Shows loading indicator while fetching data
- **Empty States** - Handles empty timesheet periods gracefully
- **Debug Panel** - Optional raw JSON data inspection for troubleshooting
- **Flexible Configuration** - Per-component parameter overrides for ProjectIds, ShowDebugPanel, and more

## Component Parameters

### `InitialDate`
Sets the initial month to display. Defaults to the current month.

```razor
<TimesheetDisplay InitialDate="new DateTime(2025, 12, 1)" />
```

### `UnbilledKeyword`
The keyword used to identify unbilled/without payment hours in task names. Defaults to `"(U/B)"` (Danish: uden betaling).

```razor
<!-- Use default "(U/B)" -->
<TimesheetDisplay />

<!-- Use custom keyword -->
<TimesheetDisplay UnbilledKeyword="[UNPAID]" />
```

### `ProjectIds`
Optional override for the Harvest project IDs to fetch. Accepts a comma-separated list of project IDs. When provided, these IDs take precedence over the values from appsettings.

```razor
<!-- Use project IDs from appsettings.json -->
<TimesheetDisplay />

<!-- Override project IDs per instance -->
<TimesheetDisplay ProjectIds="123456,789012" />
```

### `ShowDebugPanel`
Controls whether the debug panel with raw Harvest JSON data is visible. Defaults to `false`. When set to `true`, the debug panel displays by default (users can still toggle it off with the switch).

```razor
<!-- Hide debug panel (default) -->
<TimesheetDisplay />

<!-- Show debug panel by default -->
<TimesheetDisplay ShowDebugPanel="true" />
```

## Customization

### Security: Password Protection
By default, the timesheet is public. Enable password protection by setting the `Password` field in appsettings:

```json
{
  "Harvest": {
    "ApiToken": "your_api_token",
    "AccountId": "your_account_id",
    "ProjectIds": [123456, 789012],
    "Password": "MySecurePassword123"
  }
}
```

When enabled, users will be prompted with a password form before the timesheet is displayed. The component handles password verification client-side; for production, consider additional security measures.

### Styling
The component uses MudBlazor's theming system. Customize colors and spacing through your MudBlazor theme configuration.

### Unbilled Hours Keyword
By default, tasks containing "(U/B)" (Danish: uden betaling - without payment) are classified as unbilled. Use the `UnbilledKeyword` parameter to customize this:

```razor
<!-- Use custom keyword for identifying unbilled hours -->
<TimesheetDisplay UnbilledKeyword="[NO-PAY]" />
```

### Advanced: Multiple Timesheet Instances
You can display different projects on the same page by using the `ProjectIds` parameter:

```razor
<!-- Project A timesheet -->
<TimesheetDisplay ProjectIds="123456" />

<!-- Project B timesheet -->
<TimesheetDisplay ProjectIds="789012" />
```

## Required Dependencies

- **TheNerdCollective.Integrations.Harvest** 0.1.0+
- **MudBlazor** 8.15+
- **Blazor** (Web App)
- **.NET** 10.0+

## Usage Examples

### Complete Integration (Default)
```razor
@page "/timesheets"
@using TheNerdCollective.MudComponents.HarvestTimesheet

<PageTitle>Timesheets</PageTitle>

<TimesheetDisplay />

@code {
    // Component handles all logic internally
}
```

### With Password Protection Enabled
When a password is configured in appsettings, users see this automatically:

```razor
@page "/timesheets"
@using TheNerdCollective.MudComponents.HarvestTimesheet

<!-- Shows password prompt first, then timesheet after verification -->
<TimesheetDisplay />
```

### With Custom Parameters
```razor
@page "/timesheets"
@using TheNerdCollective.MudComponents.HarvestTimesheet

<TimesheetDisplay 
    InitialDate="new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1)"
    ProjectIds="123456,789012"
    UnbilledKeyword="[U/B]"
    ShowDebugPanel="false" />
```

### In a Dashboard with Tabs
```razor
@page "/dashboard"
@using TheNerdCollective.MudComponents.HarvestTimesheet

<MudContainer>
    <MudText Typo="Typo.h3" Class="mb-6">Dashboard</MudText>
    
    <MudTabs>
        <MudTabPanel Text="Overview">
            <!-- Dashboard overview content -->
        </MudTabPanel>
        <MudTabPanel Text="Timesheets">
            <TimesheetDisplay />
        </MudTabPanel>
        <MudTabPanel Text="Advanced">
            <TimesheetDisplay ShowDebugPanel="true" />
        </MudTabPanel>
    </MudTabs>
</MudContainer>
```

## Data Flow

1. Component initializes with the current month (or specified date)
2. `LoadTimesheets()` is called, which retrieves timesheet entries from Harvest API
3. Entries are displayed in a sortable table with month navigation
4. Summary statistics are calculated and displayed
5. User can navigate between months using Previous/Next buttons

## Error Handling

The component gracefully handles errors by:
- Catching API exceptions silently
- Displaying an empty state if no data is available
- Showing loading states during data retrieval

For production use, consider extending error handling to show user-friendly error messages.

## License

Apache License 2.0 - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)
