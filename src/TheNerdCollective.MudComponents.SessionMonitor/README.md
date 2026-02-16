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

🧱 **Granular Building Blocks (v1.1.0+)**
- 12 specialized components for custom dashboards
- Mix and match: counters, indicators, gauges, badges
- Full control over layout and styling
- Event callbacks for reactive UIs
- Capacity monitoring with color-coded thresholds
- Deployment safety indicators
- Session trend analysis

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

All components can be used individually or combined to create custom dashboards. Each component is self-contained and uses `ISessionMonitorService` internally.

#### 📊 Composite Components (Full Features)

##### SessionMetricsCard

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
- `Color` (Color): MudBlazor color
- `Icon` (string): MudBlazor icon name

##### SessionDetailsTable

Shows currently active circuit IDs with refresh button:

```razor
<SessionDetailsTable />
```

##### DeploymentWindowsTable

Find optimal deployment windows with configurable duration:

```razor
<DeploymentWindowsTable />
```

##### SessionHistoryChart

Display historical session data with trend analysis:

```razor
<SessionHistoryChart />
```

---

#### 🧱 Building Block Components (Granular Elements)

##### ActiveSessionsCounter

Display just the active sessions count:

```razor
<ActiveSessionsCounter 
    Label="Current Sessions"
    ValueTypo="Typo.h3"
    ValueColor="Color.Primary"
    ShowIcon="true"/>
```

**Parameters:**
- `Label` (string): Label text above counter, default: "Active Sessions"
- `LabelTypo` (Typo): Typography for label, default: `Typo.subtitle2`
- `ValueTypo` (Typo): Typography for value, default: `Typo.h4`
- `ValueColor` (Color): Color for value, default: `Color.Primary`
- `ShowIcon` (bool): Show cloud icon, default: `false`
- `IconSize` (Size): Icon size, default: `Size.Medium`
- `OnCountChanged` (EventCallback<int>): Fires when count changes

##### PeakSessionsCounter

Display just the peak sessions count:

```razor
<PeakSessionsCounter 
    Label="Peak Today"
    ValueColor="Color.Warning"
    ShowIcon="true"/>
```

**Parameters:** Same as `ActiveSessionsCounter`, default label: "Peak Sessions"

##### SessionTrendIndicator

Show trending direction with optional percentage:

```razor
<SessionTrendIndicator 
    ShowPercentage="true"
    TimeWindowMinutes="5"
    IconSize="Size.Large"/>
```

**Parameters:**
- `Label` (string): Label text, default: "Trend"
- `ShowLabel` (bool): Show label, default: `true`
- `ShowPercentage` (bool): Show percentage change, default: `false`
- `TimeWindowMinutes` (int): Time window for trend calculation, default: `5`
- `IconSize` (Size): Icon size, default: `Size.Medium`

**Trend Logic:**
- ⬆️ Green arrow if sessions increasing
- ⬇️ Red arrow if sessions decreasing
- ➡️ Gray arrow if stable

##### DeploymentSafetyIndicator

Show if it's safe to deploy (chip-style):

```razor
<DeploymentSafetyIndicator 
    MaxAllowedSessions="0"
    ShowSessionCount="true"
    ChipSize="Size.Large"/>
```

**Parameters:**
- `MaxAllowedSessions` (int): Max sessions for "safe", default: `0`
- `SafeText` (string): Text when safe, default: "Safe to Deploy"
- `UnsafeText` (string): Text when unsafe, default: "Active Sessions"
- `ShowSessionCount` (bool): Show count in unsafe state, default: `true`
- `ChipSize` (Size): Chip size, default: `Size.Medium`
- `ChipVariant` (Variant): Chip variant, default: `Variant.Filled`
- `OnSafetyChanged` (EventCallback<bool>): Fires when safety status changes

**Colors:**
- 🟢 Green when safe
- 🔴 Red when unsafe (shows session count)

##### SessionStatsBadge

Badge overlay for any content:

```razor
<SessionStatsBadge Metric="SessionStatsBadge.MetricType.ActiveSessions"
                   BadgeColor="Color.Primary">
    <MudIconButton Icon="@Icons.Material.Filled.Cloud"/>
</SessionStatsBadge>
```

**Parameters:**
- `Metric` (MetricType): Which metric to display
  - `ActiveSessions`, `PeakSessions`, `TotalStarted`, `TotalEnded`
- `BadgeColor` (Color): Badge color, default: `Color.Primary`
- `Overlap` (bool): Overlap child content, default: `true`
- `Bordered` (bool): Show border, default: `true`
- `ChildContent` (RenderFragment): Content to badge

**Auto-formatting:**
- Large numbers: `1500` → `1.5K`, `2000000` → `2.0M`

##### SessionGauge

Progress bar style capacity gauge:

```razor
<SessionGauge 
    MaxCapacity="100"
    Metric="SessionGauge.GaugeMetric.ActiveSessions"
    WarningThreshold="70"
    ErrorThreshold="90"/>
```

**Parameters:**
- `Label` (string): Gauge label, default: "Session Capacity"
- `ShowLabel` (bool): Show label, default: `true`
- `ShowValue` (bool): Show current/max text, default: `true`
- `MaxCapacity` (int): 100% value, default: `100`
- `Metric` (GaugeMetric): Which metric to display
  - `ActiveSessions`, `PeakSessions`
- `ProgressSize` (Size): Progress bar size, default: `Size.Medium`
- `Rounded` (bool): Rounded progress bar, default: `true`
- `Striped` (bool): Striped effect, default: `false`
- `WarningThreshold` (double): % for warning color, default: `70`
- `ErrorThreshold` (double): % for error color, default: `90`

**Color Logic:**
- 🟢 Green: Below warning threshold
- 🟡 Yellow: Between warning and error threshold
- 🔴 Red: Above error threshold

##### QuickMetricsBar

Compact horizontal bar with all metrics:

```razor
<QuickMetricsBar 
    ShowActive="true"
    ShowPeak="true"
    ShowStarted="true"
    ShowEnded="true"
    ShowAvgDuration="true"
    ShowRefreshButton="true"/>
```

**Parameters:**
- `ShowActive` (bool): Show active sessions, default: `true`
- `ShowPeak` (bool): Show peak sessions, default: `true`
- `ShowStarted` (bool): Show total started, default: `true`
- `ShowEnded` (bool): Show total ended, default: `true`
- `ShowAvgDuration` (bool): Show avg duration, default: `true`
- `ShowRefreshButton` (bool): Show refresh button, default: `true`
- `Elevation` (int): Paper elevation, default: `1`

**Perfect for:**
- Admin headers
- Status bars
- Compact dashboards
- Mobile layouts

---

### 🎨 Custom Dashboard Examples

Build your own dashboard by mixing components:

#### Minimal Dashboard

```razor
@page "/minimal-monitor"
@using TheNerdCollective.MudComponents.SessionMonitor

<MudContainer MaxWidth="MaxWidth.Large">
    <MudStack Spacing="3">
        <QuickMetricsBar />
        
        <MudGrid>
            <MudItem xs="6">
                <SessionTrendIndicator ShowPercentage="true"/>
            </MudItem>
            <MudItem xs="6">
                <DeploymentSafetyIndicator MaxAllowedSessions="5"/>
            </MudItem>
        </MudGrid>
    </MudStack>
</MudContainer>
```

#### Capacity Monitoring Dashboard

```razor
@page "/capacity"
@using TheNerdCollective.MudComponents.SessionMonitor

<MudContainer MaxWidth="MaxWidth.Large">
    <MudStack Spacing="3">
        <MudText Typo="Typo.h4">Capacity Monitoring</MudText>
        
        <SessionGauge 
            MaxCapacity="200"
            WarningThreshold="75"
            ErrorThreshold="90"/>
        
        <MudGrid>
            <MudItem xs="12" md="6">
                <ActiveSessionsCounter 
                    ValueTypo="Typo.h2"
                    ShowIcon="true"/>
            </MudItem>
            <MudItem xs="12" md="6">
                <PeakSessionsCounter 
                    ValueTypo="Typo.h2"
                    ShowIcon="true"/>
            </MudItem>
        </MudGrid>
        
        <SessionHistoryChart />
    </MudStack>
</MudContainer>
```

#### Deployment Operations Dashboard

```razor
@page "/ops"
@using TheNerdCollective.MudComponents.SessionMonitor

<MudContainer MaxWidth="MaxWidth.Large">
    <MudStack Spacing="3">
        <MudStack Row="true" Class="align-center">
            <MudText Typo="Typo.h4">Deployment Operations</MudText>
            <MudSpacer/>
            <DeploymentSafetyIndicator ChipSize="Size.Large"/>
        </MudStack>
        
        <QuickMetricsBar ShowRefreshButton="true"/>
        
        <DeploymentWindowsTable />
    </MudStack>
</MudContainer>
```

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
