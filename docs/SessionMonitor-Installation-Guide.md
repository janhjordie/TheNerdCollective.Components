# Installation and Usage Guide: Session Monitoring Components

Complete guide for setting up session monitoring in your Blazor Server application with both API endpoints and UI components.

## Overview

The Session Monitoring solution consists of two complementary packages:

1. **TheNerdCollective.Blazor.SessionMonitor** - Core service with REST API endpoints
2. **TheNerdCollective.MudComponents.SessionMonitor** - MudBlazor UI components for visualization

You can use them together for a complete monitoring solution, or use only the service package if you prefer to build your own UI.

---

## Option 1: Full Stack (Service + UI Components)

### Installation

```bash
# Install both packages
dotnet add package TheNerdCollective.Blazor.SessionMonitor
dotnet add package TheNerdCollective.MudComponents.SessionMonitor
```

### Setup in Program.cs

```csharp
using MudBlazor.Services;
using TheNerdCollective.Blazor.SessionMonitor;

var builder = WebApplication.CreateBuilder(args);

// Add MudBlazor services
builder.Services.AddMudServices();

// Add session monitoring service
builder.Services.AddSessionMonitoring();

// Add Razor components
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var app = builder.Build();

// Configure middleware
app.UseHttpsRedirection();
app.UseAntiforgery();
app.MapStaticAssets();

// Map session monitoring API endpoints
app.MapSessionMonitoringEndpoints();

// Map Blazor components
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
```

### Setup MudBlazor Theme (if not already configured)

**App.razor**:

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

### Usage in Razor Pages

**Pages/SessionMonitoring.razor**:

```razor
@page "/admin/session-monitor"
@using TheNerdCollective.MudComponents.SessionMonitor

<PageTitle>Session Monitoring</PageTitle>

<SessionMonitorDashboard />
```

That's it! The dashboard includes:
- ✅ Real-time metrics (active, peak, started, ended sessions)
- ✅ Average session duration
- ✅ Active sessions list
- ✅ Deployment window calculator
- ✅ Session history viewer with trends
- ✅ Auto-refresh every 5 seconds

### Individual Components

You can also use components separately for custom layouts:

```razor
@page "/admin/metrics"
@using TheNerdCollective.MudComponents.SessionMonitor
@inject ISessionMonitorService SessionMonitor

<MudContainer MaxWidth="MaxWidth.Large">
    <MudGrid>
        <!-- Custom layout with individual components -->
        <MudItem xs="12" md="6">
            <SessionMetricsCard 
                Title="Active Sessions"
                Value="@CurrentMetrics.ActiveSessions.ToString()"
                Color="Color.Primary"
                Icon="@Icons.Material.Filled.Cloud"/>
        </MudItem>
        
        <MudItem xs="12" md="6">
            <SessionMetricsCard 
                Title="Peak Sessions"
                Value="@CurrentMetrics.PeakSessions.ToString()"
                Color="Color.Warning"
                Icon="@Icons.Material.Filled.TrendingUp"/>
        </MudItem>

        <MudItem xs="12">
            <SessionDetailsTable />
        </MudItem>

        <MudItem xs="12">
            <DeploymentWindowsTable />
        </MudItem>
    </MudGrid>
</MudContainer>

@code {
    private SessionMetrics CurrentMetrics = new();

    protected override async Task OnInitializedAsync()
    {
        CurrentMetrics = SessionMonitor.GetCurrentMetrics();
    }
}
```

### Building Block Components (v1.1.0+)

Starting with **v1.1.0**, you can use granular building block components to create custom dashboards tailored to your needs. These components are smaller, focused, and can be mixed and matched.

#### Quick Metrics Bar

Perfect for headers or compact dashboards:

```razor
@page "/compact-monitor"
@using TheNerdCollective.MudComponents.SessionMonitor

<MudContainer MaxWidth="MaxWidth.ExtraLarge">
    <QuickMetricsBar 
        ShowActive="true"
        ShowPeak="true"
        ShowStarted="false"
        ShowEnded="false"
        ShowAvgDuration="true"
        ShowRefreshButton="true"/>
</MudContainer>
```

#### Capacity Monitoring

Use gauges and counters for capacity planning:

```razor
@page "/capacity"
@using TheNerdCollective.MudComponents.SessionMonitor

<MudContainer MaxWidth="MaxWidth.Large">
    <MudStack Spacing="3">
        <MudText Typo="Typo.h4">Session Capacity</MudText>
        
        <!-- Progress bar gauge -->
        <SessionGauge 
            MaxCapacity="200"
            Metric="SessionGauge.GaugeMetric.ActiveSessions"
            WarningThreshold="75"
            ErrorThreshold="90"
            ShowValue="true"/>
        
        <!-- Large counters -->
        <MudGrid>
            <MudItem xs="12" md="6">
                <MudPaper Class="pa-6">
                    <ActiveSessionsCounter 
                        Label="Current Active"
                        ValueTypo="Typo.h2"
                        ValueColor="Color.Primary"
                        ShowIcon="true"
                        IconSize="Size.Large"/>
                </MudPaper>
            </MudItem>
            <MudItem xs="12" md="6">
                <MudPaper Class="pa-6">
                    <PeakSessionsCounter 
                        Label="Peak Today"
                        ValueTypo="Typo.h2"
                        ValueColor="Color.Warning"
                        ShowIcon="true"
                        IconSize="Size.Large"/>
                </MudPaper>
            </MudItem>
        </MudGrid>
    </MudStack>
</MudContainer>
```

#### Deployment Operations Dashboard

Combine safety indicators with deployment windows:

```razor
@page "/ops/deploy"
@using TheNerdCollective.MudComponents.SessionMonitor

<MudContainer MaxWidth="MaxWidth.Large">
    <MudStack Spacing="3">
        <!-- Header with safety indicator -->
        <MudStack Row="true" Class="align-center">
            <MudText Typo="Typo.h4">Deployment Operations</MudText>
            <MudSpacer/>
            <DeploymentSafetyIndicator 
                MaxAllowedSessions="0"
                SafeText="✓ Deploy Now"
                UnsafeText="⚠ Active Sessions"
                ShowSessionCount="true"
                ChipSize="Size.Large"/>
        </MudStack>
        
        <!-- Trend indicator -->
        <MudPaper Class="pa-4">
            <MudStack Row="true" Spacing="3" Class="align-center">
                <MudText Typo="Typo.subtitle1">Session Trend (5min):</MudText>
                <SessionTrendIndicator 
                    TimeWindowMinutes="5"
                    ShowPercentage="true"
                    IconSize="Size.Large"/>
            </MudStack>
        </MudPaper>
        
        <!-- Deployment windows table -->
        <DeploymentWindowsTable />
    </MudStack>
</MudContainer>
```

#### Minimal Status Bar

Use badges for compact inline metrics:

```razor
@page "/status"
@using TheNerdCollective.MudComponents.SessionMonitor

<MudAppBar>
    <MudText Typo="Typo.h6">My App</MudText>
    <MudSpacer/>
    
    <!-- Active sessions badge on icon -->
    <SessionStatsBadge 
        Metric="SessionStatsBadge.MetricType.ActiveSessions"
        BadgeColor="Color.Primary">
        <MudIconButton Icon="@Icons.Material.Filled.Cloud" Color="Color.Inherit"/>
    </SessionStatsBadge>
    
    <!-- Deployment safety indicator -->
    <DeploymentSafetyIndicator 
        MaxAllowedSessions="5"
        ChipSize="Size.Small"
        ChipVariant="Variant.Outlined"/>
</MudAppBar>
```

#### Reactive Dashboard with Event Callbacks

Use event callbacks to react to metric changes:

```razor
@page "/reactive"
@using TheNerdCollective.MudComponents.SessionMonitor

<MudContainer MaxWidth="MaxWidth.Large">
    <MudStack Spacing="3">
        <MudAlert Severity="@AlertSeverity" Variant="Variant.Filled">
            @AlertMessage
        </MudAlert>
        
        <MudGrid>
            <MudItem xs="12" md="6">
                <ActiveSessionsCounter 
                    OnCountChanged="OnSessionCountChanged"
                    ValueTypo="Typo.h3"
                    ShowIcon="true"/>
            </MudItem>
            <MudItem xs="12" md="6">
                <DeploymentSafetyIndicator 
                    MaxAllowedSessions="10"
                    OnSafetyChanged="OnSafetyStatusChanged"
                    ChipSize="Size.Large"/>
            </MudItem>
        </MudGrid>
    </MudStack>
</MudContainer>

@code {
    private Severity AlertSeverity = Severity.Info;
    private string AlertMessage = "Monitoring sessions...";
    
    private void OnSessionCountChanged(int count)
    {
        if (count > 100)
        {
            AlertSeverity = Severity.Warning;
            AlertMessage = $"High load: {count} active sessions";
        }
        else if (count > 50)
        {
            AlertSeverity = Severity.Info;
            AlertMessage = $"Normal load: {count} active sessions";
        }
        else
        {
            AlertSeverity = Severity.Success;
            AlertMessage = $"Low load: {count} active sessions";
        }
        StateHasChanged();
    }
    
    private void OnSafetyStatusChanged(bool isSafe)
    {
        if (isSafe)
        {
            // Trigger deployment automation
            Console.WriteLine("Safe to deploy - consider triggering deployment");
        }
    }
}
```

**Available Building Blocks:**
- `ActiveSessionsCounter` - Just active sessions count
- `PeakSessionsCounter` - Just peak sessions count
- `SessionTrendIndicator` - Trend arrow with optional percentage
- `DeploymentSafetyIndicator` - Safe/unsafe chip indicator
- `SessionStatsBadge` - Badge overlay for any content
- `SessionGauge` - Progress bar style capacity gauge
- `QuickMetricsBar` - Compact horizontal metrics bar

See the [package README](../src/TheNerdCollective.MudComponents.SessionMonitor/README.md) for full API documentation.

---

## Option 2: API Only (Service Package)

If you prefer to build your own UI or consume the API from external tools.

### Installation

```bash
dotnet add package TheNerdCollective.Blazor.SessionMonitor
```

### Setup in Program.cs

```csharp
using TheNerdCollective.Blazor.SessionMonitor;

var builder = WebApplication.CreateBuilder(args);

// Add session monitoring service
builder.Services.AddSessionMonitoring();

var app = builder.Build();

// Map session monitoring API endpoints
app.MapSessionMonitoringEndpoints();

app.Run();
```

### Available API Endpoints

Once configured, the following REST endpoints are available:

#### 1. Get Current Metrics

```http
GET /api/session-monitor/current
```

**Response**:
```json
{
  "activeSessions": 42,
  "peakSessions": 150,
  "totalSessionsStarted": 1250,
  "totalSessionsEnded": 1208,
  "averageSessionDurationSeconds": 325.5,
  "timestamp": "2026-02-16T14:30:00Z"
}
```

#### 2. Get Historical Data

```http
GET /api/session-monitor/history?since=2026-02-16T00:00:00Z&maxCount=100
```

**Query Parameters**:
- `since` (optional): ISO 8601 timestamp for lookback period
- `maxCount` (optional): Maximum number of snapshots to return (default: 100, max: 10000)

**Response**:
```json
[
  {
    "timestamp": "2026-02-16T14:25:00Z",
    "activeSessions": 40,
    "sessionsStarted": 5,
    "sessionsEnded": 2
  },
  {
    "timestamp": "2026-02-16T14:20:00Z",
    "activeSessions": 37,
    "sessionsStarted": 3,
    "sessionsEnded": 1
  }
]
```

#### 3. Get Active Circuit IDs

```http
GET /api/session-monitor/active-circuits
```

**Response**:
```json
[
  "circuit-abc123",
  "circuit-def456",
  "circuit-ghi789"
]
```

#### 4. Find Optimal Deployment Windows

```http
GET /api/session-monitor/deployment-windows?windowMinutes=10&lookbackHours=24
```

**Query Parameters**:
- `windowMinutes` (optional): Duration of deployment window (default: 5)
- `lookbackHours` (optional): How far back to analyze (default: 24)

**Response**:
```json
[
  {
    "startTime": "2026-02-16T03:00:00Z",
    "endTime": "2026-02-16T03:10:00Z",
    "maxActiveSessions": 0,
    "averageActiveSessions": 0.0,
    "zeroSessionsWindow": true
  },
  {
    "startTime": "2026-02-16T02:30:00Z",
    "endTime": "2026-02-16T02:40:00Z",
    "maxActiveSessions": 2,
    "averageActiveSessions": 1.5,
    "zeroSessionsWindow": false
  }
]
```

#### 5. Check if Safe to Deploy

```http
GET /api/session-monitor/can-deploy?maxAllowedSessions=5
```

**Query Parameters**:
- `maxAllowedSessions` (optional): Maximum active sessions allowed (default: 0)

**Response**:
```json
{
  "canDeploy": true,
  "currentActiveSessions": 3,
  "reason": "Current active sessions (3) is within threshold (5)"
}
```

---

## Use Cases

### 1. Production Monitoring Dashboard

Display real-time session metrics on wall monitors or admin dashboards:

```razor
@page "/ops/dashboard"
@using TheNerdCollective.MudComponents.SessionMonitor

<SessionMonitorDashboard />
```

### 2. Automated Deployment Safety Check

Before deploying, check if there are active sessions:

```csharp
var response = await httpClient.GetAsync("/api/session-monitor/can-deploy?maxAllowedSessions=0");
var result = await response.Content.ReadFromJsonAsync<CanDeployResponse>();

if (result.CanDeploy)
{
    // Proceed with deployment
    await DeployNewVersion();
}
else
{
    // Wait or reschedule
    Console.WriteLine($"Deployment delayed: {result.Reason}");
}
```

### 3. Capacity Planning

Analyze historical data to plan infrastructure scaling:

```csharp
var history = await httpClient.GetAsync("/api/session-monitor/history?lookbackHours=168");
var snapshots = await history.Content.ReadFromJsonAsync<List<SessionSnapshot>>();

var peakUsage = snapshots.Max(s => s.ActiveSessions);
Console.WriteLine($"Peak concurrent sessions in last week: {peakUsage}");
```

### 4. Scheduled Maintenance Windows

Find optimal deployment times with zero active sessions:

```razor
@page "/admin/deployment-planner"
@using TheNerdCollective.MudComponents.SessionMonitor

<MudContainer MaxWidth="MaxWidth.Large">
    <MudText Typo="Typo.h4">Deployment Planner</MudText>
    
    <DeploymentWindowsTable />
    
    <MudText Typo="Typo.body2" Class="mt-4">
        Schedule deployments during "Zero Sessions" windows to minimize user impact.
    </MudText>
</MudContainer>
```

---

## Customization

### Change Auto-Refresh Interval

The `SessionMonitorDashboard` refreshes every 5 seconds by default. To customize:

```csharp
// Create a custom dashboard component
@inherits SessionMonitorDashboard

@code {
    protected override async Task OnInitializedAsync()
    {
        await base.OnInitializedAsync();
        
        // Custom refresh timer (10 seconds instead of 5)
        _refreshTimer?.Dispose();
        _refreshTimer = new Timer(async _ =>
        {
            await Refresh();
            await InvokeAsync(StateHasChanged);
        }, null, TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(10));
    }
}
```

### Custom Metrics Cards

Create your own metric cards with custom colors and icons:

```razor
<SessionMetricsCard 
    Title="Critical Alerts"
    Value="@alertCount.ToString()"
    Color="Color.Error"
    Icon="@Icons.Material.Filled.Warning"/>
```

### Integrate with External Monitoring

Send metrics to external systems (Prometheus, Datadog, etc.):

```csharp
public class MetricsExporter : BackgroundService
{
    private readonly ISessionMonitorService _sessionMonitor;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var metrics = _sessionMonitor.GetCurrentMetrics();
            
            // Export to Prometheus, Datadog, etc.
            await ExportMetrics(metrics);
            
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
```

---

## Troubleshooting

### "ISessionMonitorService not registered"

**Problem**: Component throws exception saying service is not found.

**Solution**: Ensure you called `AddSessionMonitoring()` in `Program.cs`:

```csharp
builder.Services.AddSessionMonitoring();
```

### No History Data Available

**Problem**: `SessionHistoryChart` shows "no history available".

**Reason**: History is only recorded when sessions start or end. If your app has been idle, there's no data.

**Solution**: 
1. Wait for sessions to start/end naturally
2. Try a longer lookback period (24+ hours)
3. Check with the API directly: `GET /api/session-monitor/history`

### Deployment Windows Always Empty

**Problem**: No optimal windows found even with long lookback.

**Reason**: Your application has continuous traffic with no zero-session windows.

**Solution**: 
1. Increase the lookback period to 48+ hours
2. Adjust `maxAllowedSessions` to allow low-traffic windows
3. Consider scheduled maintenance windows instead

### Dashboard Not Auto-Refreshing

**Problem**: Metrics don't update automatically.

**Solution**: Ensure `StateHasChanged()` is being called in the timer callback and the component isn't disposed prematurely.

---

## Performance Considerations

### Memory Usage

The service stores up to **10,000 historical snapshots** in memory. This is approximately:
- 10,000 snapshots × ~100 bytes = ~1 MB of memory
- Configurable in `SessionMonitorService.cs` (change `MaxHistorySize` constant)

### API Rate Limiting

The monitoring endpoints have no built-in rate limiting. For production:

```csharp
// Add rate limiting in Program.cs
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("monitoring", config =>
    {
        config.Window = TimeSpan.FromSeconds(10);
        config.PermitLimit = 100;
    });
});

// Apply to endpoints
app.MapSessionMonitoringEndpoints()
   .RequireRateLimiting("monitoring");
```

### Auto-Refresh Impact

The dashboard's 5-second auto-refresh has minimal impact:
- ~1 KB per refresh (metrics JSON)
- 720 requests/hour per connected user
- Use SignalR for high-traffic scenarios to push updates instead of polling

---

## Security

### Endpoint Authorization

**IMPORTANT**: Session monitoring endpoints expose operational data. Protect them with authorization:

```csharp
// In Program.cs
app.MapSessionMonitoringEndpoints()
   .RequireAuthorization("AdminOnly");

// Define authorization policy
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Administrator"));
});
```

### Dashboard Access Control

Protect the dashboard page with authorization:

```razor
@page "/admin/session-monitor"
@attribute [Authorize(Roles = "Administrator")]
@using TheNerdCollective.MudComponents.SessionMonitor

<SessionMonitorDashboard />
```

---

## Migration from Legacy Monitoring

If you're currently using custom session tracking, migration is straightforward:

1. **Install packages** (see Installation above)
2. **Register service**: `AddSessionMonitoring()` in Program.cs
3. **Remove legacy tracking code** (custom CircuitHandlers, timers, etc.)
4. **Update UI** to use new components or API endpoints
5. **Test thoroughly** before production deployment

The new solution:
- ✅ Thread-safe with concurrent collections
- ✅ Automatic cleanup of ended sessions
- ✅ Battle-tested in production environments
- ✅ Regular updates and bug fixes

---

## Support

For issues, feature requests, or questions:
- 🐛 [GitHub Issues](https://github.com/janhjordie/TheNerdCollective.Components/issues)
- 📚 [Package Documentation](https://github.com/janhjordie/TheNerdCollective.Components/tree/main/src/TheNerdCollective.MudComponents.SessionMonitor)
- 💬 GitHub Discussions

---

## Related Packages

- **[TheNerdCollective.Blazor.Reconnect](../TheNerdCollective.Blazor.Reconnect/README.md)** - Professional circuit reconnection UI
- **[TheNerdCollective.Blazor.VersionMonitor](../TheNerdCollective.Blazor.VersionMonitor/README.md)** - Version update notifications
- **[TheNerdCollective.MudComponents.MudQuillEditor](../TheNerdCollective.MudComponents.MudQuillEditor/README.md)** - Rich-text editor

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)
