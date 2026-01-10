# TheNerdCollective.Components.BlazorServerCircuitHandler

A production-ready Blazor Server circuit reconnection handler with automatic reconnection UI and graceful error handling.

## Overview

This package provides a drop-in Razor component that handles Blazor Server circuit reconnection scenarios with:
- Automatic reconnection with exponential backoff
- Silent reconnection for brief interruptions
- Professional reconnection overlay with countdown timer
- Graceful handling of server restarts and deployments

## Quick Start

### Install the package

```bash
dotnet add package TheNerdCollective.Components.BlazorServerCircuitHandler
```

### Recommended setup (App.razor or root layout)

Use autostart=false so the handler can start Blazor with the custom reconnection logic. This yields the most reliable behavior.

```razor
<body>
  <Routes @rendermode="InteractiveServer" />

  <!-- Optional: configure before start -->
  <script>
    window.blazorReconnectionConfig = {
      statusUrl: '/reconnection-status.json',
      checkStatus: true,
      statusPollInterval: 5000
    };
  </script>

  <!-- Load Blazor BEFORE the handler -->
  <script src="_framework/blazor.web.js" autostart="false"></script>

  <!-- Starts Blazor with robust reconnection -->
  <CircuitReconnectionHandler @rendermode="InteractiveServer" />

  <!-- Other scripts after -->
  <script src="_content/MudBlazor/MudBlazor.min.js"></script>
</body>
```

⚠️ Critical: `blazor.web.js` must load before the component, and with `autostart="false"` so the handler can call `Blazor.start()`.

Import once (e.g. `_Imports.razor`):

```razor
@using TheNerdCollective.Components.BlazorServerCircuitHandler
```

### Classic layout (_Host.cshtml)

```html
<script>
  window.blazorReconnectionConfig = { checkStatus: true };
</script>
<script src="_framework/blazor.web.js" autostart="false"></script>
<component type="typeof(CircuitReconnectionHandler)" render-mode="ServerPrerendered" />
```

### Fallback (autostart enabled)

If your app must autostart Blazor, the handler detects the default reconnect modal and upgrades it. This works, but the autostart=false setup above is recommended.

## Features

✅ **Automatic Reconnection** - Infinite reconnection with exponential backoff (1s → 5s)  
✅ **Silent First Attempts** - No UI shown for quick reconnects (first 5 attempts)  
✅ **Professional UI** - Beautiful reconnection overlay with countdown timer  
✅ **Planned Deployment Support** - Show custom deployment messages during scheduled downtime  
✅ **Error Suppression** - Filters out MudBlazor and expected disconnection errors  
✅ **Graceful Fallback** - Auto-reload when circuits expire  
✅ **Zero Configuration** - Works out of the box  
✅ **Offline-Aware** - Pauses while offline, resumes and retries when online

## How It Works

### Scenario 1: Brief Network Interruption
```
Connection lost → 5 silent reconnection attempts → Connected
Result: User sees nothing
```

### Scenario 2: Extended Disconnection
```
Connection lost → 5 failed attempts → UI overlay shown
User waits or clicks "Reload Now" → Connection restored
Result: Overlay disappears, app continues normally
```

### Scenario 3: Server Restart/Deployment
```
Circuit expires → Auto-reload triggered
Result: Fresh session with new app instance
```

### Scenario 4: Planned Deployment
```
Deployment begins → deployment-status.json detected
→ Show deployment message with features list
→ Poll for completion → Auto-reload when done
Result: User informed about deployment, smooth transition
```

## Configuration

### Important: Script Load Order

When customizing the dialog with inline JavaScript, configure BEFORE loading the component:

```razor
<body>
    <Routes @rendermode="InteractiveServer" />
    
    <!-- 1. Configuration script (optional, for customization) -->
    <script>
        window.configureBlazorReconnection({
            reconnectingHtml: `<div>Your custom HTML</div>`,
            primaryColor: '#FF5722'
        });
    </script>
    
    <!-- 2. Load Blazor framework -->
    <script src="_framework/blazor.web.js" autostart="false"></script>
    
    <!-- 3. Load reconnection handler -->
    <CircuitReconnectionHandler @rendermode="InteractiveServer" />
</body>
```

### Basic Usage

The handler uses sensible defaults and requires zero configuration:

```razor
<script src="_framework/blazor.web.js" autostart="false"></script>
<CircuitReconnectionHandler @rendermode="InteractiveServer" />
```

### Status Endpoint (optional)

For maximum reliability during deployments, expose a lightweight status endpoint the UI can poll. If you're using the `TheNerdCollective.Services.BlazorServer` package, map it like this:

```csharp
// Program.cs
using TheNerdCollective.Services.BlazorServer;

app.MapBlazorReconnectionStatusEndpoint("/reconnection-status.json");
```

Point the component to the endpoint (defaults to `/reconnection-status.json`):

```razor
<CircuitReconnectionHandler StatusUrl="/reconnection-status.json" CheckStatus="true" />
```
Recommended: return `deploying` during CI/CD to show a friendly deployment overlay and auto-reload when complete.

### Customizing Colors

```razor
<CircuitReconnectionHandler 
    @rendermode="InteractiveServer"
    PrimaryColor="#FF5722"
    SuccessColor="#00C853" />
```

### Custom Spinner Image

```razor
<CircuitReconnectionHandler 
    @rendermode="InteractiveServer"
    SpinnerUrl="/images/custom-spinner.gif" />
```

### Custom CSS

```razor
<CircuitReconnectionHandler 
    @rendermode="InteractiveServer"
    CustomCss="@customCss" />

@code {
    private string customCss = @"
        @keyframes spin { to { transform: rotate(360deg); } }
        #blazor-reconnect-modal { font-family: 'Roboto', sans-serif; }
        #manual-reload-btn:hover { opacity: 0.9; }
    ";
}
```

### Fully Custom HTML Dialog

For complete control over the dialog appearance, provide custom HTML:

```razor
<CircuitReconnectionHandler 
    @rendermode="InteractiveServer"
    ReconnectingHtml="@reconnectingHtml"
    ServerRestartHtml="@serverRestartHtml"
    CustomCss="@customCss" />

@code {
    private string reconnectingHtml = @"
        <div style='position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999; 
                    display: flex; align-items: center; justify-content: center;'>
            <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        padding: 3rem; border-radius: 16px; text-align: center; color: white;'>
                <img src='/logo.svg' style='width: 64px; margin-bottom: 1rem;' />
                <h2>We'll be right back!</h2>
                <p id='reconnect-status'>Reconnecting to server...</p>
                <p id='reconnect-countdown'>Next try in <span id='countdown-seconds'>1</span>s</p>
                <button id='manual-reload-btn' style='background: white; color: #667eea; 
                        border: none; padding: 0.75rem 2rem; border-radius: 8px; cursor: pointer;'>
                    Refresh Page
                </button>
            </div>
        </div>
    ";

    private string serverRestartHtml = @"
        <div style='position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999; 
                    display: flex; align-items: center; justify-content: center;'>
            <div style='background: white; padding: 3rem; border-radius: 16px; text-align: center;'>
                <h2>Updating...</h2>
                <p>Please wait while we reload the application.</p>
            </div>
        </div>
    ";

    private string customCss = @"
        @keyframes spin { to { transform: rotate(360deg); } }
        h2 { margin: 0 0 1rem; }
    ";
}
```

**Important placeholder IDs for custom HTML:**
- `reconnect-status` - Updated with status messages
- `countdown-seconds` - Displays countdown timer
- `manual-reload-btn` - Must have this ID for reload functionality

### Component Parameters

- `ReconnectingHtml`: Custom HTML for reconnect UI.
- `ServerRestartHtml`: Custom HTML when circuit expires.
- `DeploymentHtml`: Custom HTML when status indicates deployment.
- `CustomCss`: Inline CSS to style the dialog.
- `SpinnerUrl`: Custom spinner image URL.
- `PrimaryColor` / `SuccessColor`: Brand colors.
- `StatusUrl`: Status/health endpoint (default: `/reconnection-status.json`).
- `CheckStatus`: Enable status checks (default: `true`).
- `StatusPollInterval`: Poll interval in ms (default: `5000`).

## Planned Deployment Support

Show friendly deployment messages to users during scheduled maintenance or deployments.

### ⚠️ Critical: Hosting the Status File

**Problem:** When your Blazor Server goes down during deployment, it cannot serve the status file.

**Solution:** Host the status file on **Azure Blob Storage** (or similar) that stays accessible during deployment.

### Azure Blob Storage Setup (Recommended)

1. **Deploy blob storage** with public access:

```bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'stbilletsalgprodweu'
  properties: {
    allowBlobPublicAccess: true
  }
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: 'deployment-status'
  properties: {
    publicAccess: 'Blob'  // Public read access
  }
}
```

2. **Configure App.razor** to point to blob storage:

```razor
<script>
    window.blazorReconnectionConfig = {
        statusUrl: 'https://stbilletsalgprodweu.blob.core.windows.net/deployment-status/reconnection-status.json',
        checkStatus: true,
        statusPollInterval: 5000
    };
</script>

<script src="_framework/blazor.web.js"></script>
<script src="_content/TheNerdCollective.Components.BlazorServerCircuitHandler/js/blazor-reconnect.js"></script>
```

3. **Update status via Azure CLI**:

```bash
# Before deployment
cat > status.json << EOF
{
  "version": "1.1.0",
  "status": "deploying",
  "reconnectingMessage": "Connection lost. Waiting for server...",
  "deploymentMessage": "We're deploying new features! 🚀",
  "features": ["Performance improvements", "New features"],
  "estimatedDurationMinutes": 3
}
EOF

az storage blob upload \
  --account-name stbilletsalgprodweu \
  --container-name deployment-status \
  --name reconnection-status.json \
  --file status.json \
  --overwrite

# After deployment
cat > status.json << EOF
{
  "version": "1.1.0",
  "status": "normal",
  "reconnectingMessage": "Connection lost. Reconnecting...",
  "deploymentMessage": null,
  "features": [],
  "estimatedDurationMinutes": null
}
EOF

az storage blob upload \
  --account-name stbilletsalgprodweu \
  --container-name deployment-status \
  --name reconnection-status.json \
  --file status.json \
  --overwrite
```

### Using C# SDK (TheNerdCollective.Services.Azure)

Install the package:

```bash
dotnet add package TheNerdCollective.Services
```

Configure and use:

```csharp
// appsettings.json
{
  "AzureBlob": {
    "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=...",
    "ContainerName": "deployment-status"
  }
}

// Program.cs
builder.Services.AddAzureBlobService(builder.Configuration);

// DeploymentStatusService.cs
public class DeploymentStatusService
{
    private readonly AzureBlobService _blobService;
    
    public async Task SetDeployingAsync(string version, string[] features)
    {
        var status = new {
            version,
            status = "deploying",
            deploymentMessage = "We're deploying new features! 🚀",
            features,
            estimatedDurationMinutes = 3
        };
        
        var json = JsonSerializer.SerializeToUtf8Bytes(status);
        await _blobService.UploadAsync(json, "deployment-status", "reconnection-status.json");
    }
}
```

### Status File Schema

```json
{
  "version": "1.1.0",
  "status": "deploying",  // or "normal"
  "reconnectingMessage": "Connection lost. Waiting...",
  "deploymentMessage": "We're deploying updates! 🚀",
  "features": [
    "Performance improvements",
    "New reporting features"
  ],
  "estimatedDurationMinutes": 3
}
```

**Deployment Mode Triggers:**
- `status === "deploying"`, OR
- `deploymentMessage` is set (not null/empty)

**Completion Detection:**
- Version changes (e.g., "1.0.0" → "1.1.0"), OR
- `status` changes to "normal", OR
- File is removed/unreachable

### Local Development Testing

When running on **localhost**, the handler automatically tries to load `/reconnection-status.dev.json` first before falling back to the configured `statusUrl`. This allows easy testing without changing production configuration.

**Quick test:**
```json
// Create: wwwroot/reconnection-status.dev.json
{
  "version": "1.0.0-dev",
  "status": "deploying",
  "deploymentMessage": "🛠️ Testing deployment UI",
  "features": ["Test feature 1", "Test feature 2"],
  "estimatedDurationMinutes": 1
}
```

The handler detects localhost based on hostname (localhost, 127.0.0.1, 192.168.x.x, etc.) and automatically uses the `.dev.json` file for local testing.

### Custom Deployment UI

Configure custom deployment HTML in App.razor:

```razor
<body>
    <Routes @rendermode="InteractiveServer" />
    
    <script>
        window.blazorReconnectionConfig = {
            deploymentHtml: `
                <div style='position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; 
                            display: flex; align-items: center; justify-content: center;'>
                    <div style='background: #1e293b; padding: 3rem; border-radius: 16px; 
                                color: white; text-align: center; max-width: 500px;'>
                        <h2 style='color: #60a5fa;'>🚀 Deploying Updates</h2>
                        <p>We're making things better! Check back in a moment.</p>
                    </div>
                </div>
            `,
            deploymentStatusUrl: '/deployment-status.json',
            deploymentPollInterval: 5000
        };
    </script>
    
    <script src="_framework/blazor.web.js"></script>
    <script src="_content/TheNerdCollective.Components.BlazorServerCircuitHandler/js/blazor-reconnect.js"></script>
</body>
```

## Recommended Host Setup

For best reliability during outages and deployments:

1) Expose a tiny JSON status endpoint (in your host app):

```csharp
using TheNerdCollective.Services.BlazorServer;

app.MapBlazorReconnectionStatusEndpoint("/reconnection-status.json");
```

2) Improve circuit retention (smoother reconnects):

```csharp
builder.Services.AddBlazorServerCircuitServices(builder.Configuration, builder.Environment);
builder.Host.ConfigureBlazorServerCircuitShutdown();
```

3) Point the component at the endpoint:

```razor
<script src="_framework/blazor.web.js" autostart="false"></script>
<CircuitReconnectionHandler CheckStatus="true" StatusUrl="/reconnection-status.json" />
```

## Troubleshooting

- Overlay never shows or Blazor won’t start
  - Ensure `_framework/blazor.web.js` is loaded before the component and uses `autostart="false"`.
  - If you can’t change this, rely on the fallback autostart path.
- Never recovers during deployment
  - Serve `reconnection-status.json` from your app or an external store (e.g., Azure Blob) and set `StatusUrl`.
  - Toggle `status: "deploying"` at deployment start and `ok` (or remove file) at completion.
- Circuits expire too often
  - Increase `DisconnectedCircuitRetentionPeriod` via `TheNerdCollective.Services.BlazorServer` for longer grace time.
- Behind a proxy/load balancer
  - Enable WebSockets and ensure idle/keep-alive timeouts aren’t too aggressive. Configure affinity if required.

### GitHub Actions Integration

Automate deployment status updates in your CI/CD pipeline:

```yaml
- name: Deploy Blob Storage
  run: |
    az deployment group create \
      --resource-group $RESOURCE_GROUP \
      --template-file deploy/bicep/blob-storage.bicep \
      --parameters storageAccountName=$STORAGE_NAME

- name: Set deployment status (deploying)
  run: |
    cat > status.json << EOF
    {
      "version": "${{ github.sha }}",
      "status": "deploying",
      "deploymentMessage": "Deploying version ${{ github.sha }}",
      "features": ["Latest updates from ${{ github.ref_name }}"],
      "estimatedDurationMinutes": 3
    }
    EOF
    
    az storage blob upload \
      --account-name $STORAGE_NAME \
      --container-name deployment-status \
      --name reconnection-status.json \
      --file status.json \
      --overwrite

- name: Deploy Blazor Server Apps
  # Server goes DOWN, but blob storage stays UP ✅

- name: Reset deployment status (normal)
  run: |
    cat > status.json << EOF
    {
      "version": "${{ github.sha }}",
      "status": "normal",
      "deploymentMessage": null
    }
    EOF
    
    az storage blob upload \
      --account-name $STORAGE_NAME \
      --container-name deployment-status \
      --name reconnection-status.json \
      --file status.json \
      --overwrite
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `checkStatus` | `true` | Enable deployment status detection |
| `statusUrl` | `/reconnection-status.json` | URL to status file (use blob storage URL!) |
| `statusPollInterval` | `5000` | Poll interval (ms) to check for deployment completion |
| `deploymentHtml` | Auto-generated | Custom deployment UI HTML |

### Circuit Options

Customize circuit behavior in `Program.cs`:

```csharp
builder.Services.Configure<CircuitOptions>(options =>
{
    options.DisconnectedCircuitRetentionPeriod = TimeSpan.FromMinutes(10);
    options.JSInteropDefaultCallTimeout = TimeSpan.FromSeconds(30);
    options.DetailedErrors = builder.Environment.IsDevelopment();
});
```

## Testing & Development

The reconnection handler exposes a testing API in the browser console for manual testing and debugging.

### Testing API

After the handler loads, you'll see:
```
[Blazor] 🧪 Testing API available: BlazorReconnectionTest.disconnect(), .goOffline(), .goOnline(), .status(), .refreshStatus()
```

### Available Test Methods

Open browser DevTools console and use:

```javascript
// Force disconnect the Blazor circuit (shows reconnection UI)
BlazorReconnectionTest.disconnect()

// Simulate network going offline
BlazorReconnectionTest.goOffline()

// Simulate network coming back online
BlazorReconnectionTest.goOnline()

// View current reconnection status and configuration
BlazorReconnectionTest.status()

// Force refresh the deployment status from server
await BlazorReconnectionTest.refreshStatus()
```

### Testing Scenarios

**Test Brief Reconnection (Silent)**
```javascript
// Disconnect briefly - should reconnect without showing UI
BlazorReconnectionTest.disconnect()
// Wait a few seconds, circuit reconnects silently
```

**Test Extended Reconnection (UI Appears)**
```javascript
// Keep disconnecting to trigger UI after 5 attempts
for (let i = 0; i < 6; i++) {
  BlazorReconnectionTest.disconnect()
}
// Reconnection overlay appears with countdown
```

**Test Offline Detection**
```javascript
// Simulate offline
BlazorReconnectionTest.goOffline()
// See "No network connection" message

// Come back online
BlazorReconnectionTest.goOnline()
// Reconnection attempts resume
```

**Test Deployment Status**
```javascript
// Check current deployment status
await BlazorReconnectionTest.refreshStatus()

// View what the handler sees
BlazorReconnectionTest.status()
```

### Browser Network Throttling (Alternative)

You can also test using browser DevTools:
1. Open DevTools → **Network** tab
2. Change throttling to **Offline**
3. Wait 2-3 seconds → reconnection UI appears
4. Change back to **No throttling** → reconnects

## Dependencies

- **MudBlazor** 8.15+ (optional, but recommended)
- **.NET** 10.0+
- **Blazor Server** enabled

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## License

Apache License 2.0 - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)

By [Jan Hjørdie](https://github.com/janhjordie/) - [LinkedIn](https://www.linkedin.com/in/janhjordie/) | [Dev.to](https://dev.to/janhjordie)

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions, visit:
- GitHub: https://github.com/janhjordie/TheNerdCollective.Components

## Version History

- **1.1.0** (2025-12-20) - Added planned deployment support with status file detection and custom deployment UI
- **1.0.0** (2025-12-19) - Initial release with infinite reconnection handler, professional UI, and error suppression

---

**Built with ❤️ for the Blazor Server community**
