# TheNerdCollective.MudComponents.SessionMonitor

MudBlazor components for monitoring Blazor Server sessions and circuits with real-time metrics, charts, and optimal deployment window detection.

## Features

✨ **Real-Time Metrics Dashboard**
- Live active session count
- Peak sessions tracking
- Total sessions started/ended
- Average session duration

📊 **Session Monitoring**
- View all active circuit IDs
- Real-time session list updates
- Session count trends

🚀 **Deployment Windows**
- Automatically detect optimal deployment windows (zero/low session periods)
- Configurable window duration and lookback period
- Perfect for scheduling blue-green deployments

📈 **Session History**
- Visual history of session counts over time
- Configurable lookback period and data granularity
- Trend indicators (up/down arrows) for easy analysis

## Installation

### 1. Install NuGet Package

```bash
dotnet add package TheNerdCollective.MudComponents.SessionMonitor
```

### 2. Register Services in Program.cs

This package requires the `ISessionMonitorService` from `TheNerdCollective.Blazor.SessionMonitor`. Make sure it's registered first:

```csharp
using MudBlazor.Services;
using TheNerdCollective.Blazor.SessionMonitor;

var builder = WebApplication.CreateBuilder(args);

// Add MudBlazor services
builder.Services.AddMudServices();

// Add session monitoring service
builder.Services.AddSessionMonitoring();

// Map session monitoring endpoints (for API access)
app.MapSessionMonitoringEndpoints();

// ... rest of your configuration
```

### 3. Setup MudBlazor Theme in App.razor

If you haven't already, add MudBlazor theme providers:

```razor
<MudThemeProvider/>
<MudDialogProvider/>
<MudSnackbarProvider/>

<Router AppAssembly="@typeof(Program).Assembly">
    <Found Context="routeData">
        <RouteView RouteData="@routeData" DefaultLayout="@typeof(MainLayout)" />
    </Found>
</Router>
```

## Usage

### Basic Dashboard

Add the dashboard component to any page:

```razor
@page "/session-monitor"
@using TheNerdCollective.MudComponents.SessionMonitor

<SessionMonitorDashboard />
```

This displays:
- Live metrics grid (active, peak, started, ended sessions)
- Average session duration
- Tabbed interface for:
  - Active sessions list
  - Deployment windows calculator
  - Session history viewer

### Individual Components

#### SessionMetricsCard

Display a single metric with icon and color:

```razor
<SessionMetricsCard 
    Title="Active Sessions"
    Value="42"
    Color="Color.Primary"
    Icon="@Icons.Material.Filled.Cloud"/>
```

**Parameters:**
- `Title` (string): Metric label
- `Value` (string): The value to display
- `Color` (Color): MudBlazor color (Primary, Secondary, Success, Warning, Error, Info)
- `Icon` (string): MudBlazor icon name

#### SessionDetailsTable

Shows currently active circuit IDs:

```razor
<SessionDetailsTable />
```

**Parameters:** None (uses `ISessionMonitorService` internally)

#### DeploymentWindowsTable

Find optimal deployment windows:

```razor
<DeploymentWindowsTable />
```

Allows users to:
- Adjust the window duration (1-60 minutes)
- Calculate optimal windows with zero/minimal sessions
- View max and average sessions during each window

#### SessionHistoryChart

Display historical session data:

```razor
<SessionHistoryChart />
```

Allows users to:
- Set lookback period (1-168 hours)
- Limit number of records displayed (10-1000)
- See trend indicators for each snapshot

## MudBlazor Compliance

This component library follows MudBlazor v8.15.0+ standards:

✅ Uses only valid MudBlazor colors from the `Color` enum:
- `Color.Primary`, `Color.Secondary`, `Color.Tertiary`
- `Color.Success`, `Color.Warning`, `Color.Error`, `Color.Info`

✅ Uses only verified Material Design icons from `Icons.Material.Filled`

✅ All generic components properly typed
- `MudDataGrid<T>`, `MudNumericField<T>`, etc.

✅ Responsive grid layout with mobile-first approach
- XS (mobile), SM (tablet), MD (desktop)

✅ Proper MudBlazor spacing and typography
- `Typo.h4`, `Typo.subtitle1`, `Typo.body2`, `Typo.caption`
- `Class="pa-4"`, `Spacing="2"`, etc.

## Integration with SessionMonitor Service

This package wraps the `ISessionMonitorService` interface from `TheNerdCollective.Blazor.SessionMonitor`:

```csharp
// Service provides these methods:
SessionMetrics GetCurrentMetrics();  // Live metrics
IEnumerable<SessionSnapshot> GetHistory(DateTime? since = null, int maxCount = 100);
IEnumerable<string> GetActiveCircuitIds();
bool HasActiveSessions();
IEnumerable<DeploymentWindow> FindOptimalDeploymentWindows(
    int windowMinutes = 5, 
    int lookbackHours = 24);
```

## Auto-Refresh Behavior

The `SessionMonitorDashboard` component automatically refreshes metrics every 5 seconds. This is achieved using a `Timer` that:

1. Calls `SessionMonitor.GetCurrentMetrics()`
2. Triggers `StateHasChanged()` to re-render

You can customize the refresh interval by modifying the `SessionMonitorDashboard.razor` component.

## Common Use Cases

### 1. Deployment Safety Check

Use `DeploymentWindowsTable` before deploying:

```
1. Go to Session Monitor > Deployment Windows
2. Set window duration (e.g., 10 minutes)
3. Click "Find Optimal Windows"
4. Look for "Zero Sessions" windows
5. Deploy during that period
```

### 2. Real-Time System Health Monitoring

Display `SessionMonitorDashboard` on a wall monitor during business hours to track:
- Peak usage times
- Session stability
- Unusual spikes or drops

### 3. Operational Dashboards

Embed individual components in admin dashboards:

```razor
<MudContainer MaxWidth="MaxWidth.Large">
    <MudGrid>
        <MudItem xs="12" md="6">
            <SessionMetricsCard Title="Live Sessions" 
                               Value="@Metrics.ActiveSessions.ToString()"
                               Color="Color.Primary"/>
        </MudItem>
        <MudItem xs="12" md="6">
            <SessionDetailsTable />
        </MudItem>
    </MudGrid>
</MudContainer>
```

## Troubleshooting

### "ISessionMonitorService not registered"

**Problem:** Component throws exception saying service is not found.

**Solution:** Ensure you called `AddSessionMonitoring()` in `Program.cs`:

```csharp
builder.Services.AddSessionMonitoring();
```

### No History Data

**Problem:** `SessionHistoryChart` shows "no history available".

**Reason:** History is only recorded when sessions start or end. If your app has been idle, there's no data.

**Solution:** 
1. Wait for sessions to start/end naturally
2. Try a longer lookback period
3. Check with `SessionMonitor.GetHistory()` manually

### Deployment Windows Always Empty

**Problem:** No optimal windows found even with long lookback.

**Reason:** Your application has continuous traffic with no zero-session windows.

**Solution:** 
1. Increase the lookback period to 48+ hours
2. Increase the maximum allowed sessions in the window calculation
3. Consider scheduled maintenance windows instead

## Dependencies

- **MudBlazor** >= 8.15.0 - UI components and theming
- **TheNerdCollective.Blazor.SessionMonitor** - Session tracking service

## License

Apache License 2.0 - See LICENSE file in repository root

## Contributing

Contributions welcome! Please ensure:
- Components follow MudBlazor standards (02-mudblazor-standards.md)
- All parameters are properly documented
- Icons and colors are verified in official MudBlazor docs
- Responsive design is tested on mobile, tablet, and desktop

## Related Packages

- **TheNerdCollective.Blazor.SessionMonitor** - Core service for tracking sessions
- **TheNerdCollective.MudComponents.MudQuillEditor** - Rich-text editor component
- **TheNerdCollective.MudComponents.MudSwiper** - Carousel component
