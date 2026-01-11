# TheNerdCollective.Components.BlazorServerCircuitHandler

A lightweight, non-invasive deployment status overlay for Blazor Server applications.

## Overview

This package provides a simple JavaScript overlay that:
- **Polls a status endpoint** for deployment information
- **Shows deployment overlay** during deployments (with phase, features, ETA)
- **Shows version banner** when a new version is available
- **Enhances Blazor's default reconnect modal** with a custom UI

**Key Design Principle:** This handler does **NOT** interfere with Blazor's startup process. Blazor starts normally with `autostart="true"` (the default) - no `Blazor.start()` calls, no timing issues.

## Quick Start

### 1. Install the package

```bash
dotnet add package TheNerdCollective.Components.BlazorServerCircuitHandler
```

### 2. Add to App.razor

```razor
<body>
    <Routes @rendermode="InteractiveServer" />

    <!-- Optional: Configure before loading -->
    <script>
        window.blazorReconnectionConfig = {
            statusUrl: 'https://yourstorage.blob.core.windows.net/deployment-status/reconnection-status.json',
            checkStatus: true
        };
    </script>

    <!-- Blazor starts normally (no autostart=false needed!) -->
    <script src="_framework/blazor.web.js"></script>
    
    <!-- Status overlay - just polls and shows UI, doesn't touch Blazor startup -->
    <script src="_content/TheNerdCollective.Components.BlazorServerCircuitHandler/js/blazor-reconnect.js"></script>
    
    <script src="_content/MudBlazor/MudBlazor.min.js"></script>
</body>
```

That's it! No `autostart="false"`, no special component, no timing issues.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        Page Load                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  blazor.web.js  ────────────►  Blazor starts normally           │
│                                (default behavior, no changes)    │
│                                                                  │
│  blazor-reconnect.js  ──────►  Independent overlay               │
│      │                         (polls status, shows UI)          │
│      │                                                           │
│      ├── Polls /reconnection-status.json                        │
│      │                                                           │
│      ├── If deploying → Shows deployment overlay                │
│      │                                                           │
│      ├── If version changed → Shows version banner              │
│      │                                                           │
│      └── If Blazor disconnects → Enhances default modal         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

The overlay is completely decoupled from Blazor - it just watches for DOM changes and polls a status endpoint.

## Features

✅ **Non-Invasive** - Blazor starts normally, no `autostart="false"` required  
✅ **Deployment Overlay** - Shows deployment phase, features list, and ETA  
✅ **Version Banner** - Notifies users when a new version is available  
✅ **Reconnection UI** - Enhances Blazor's default reconnect modal  
✅ **Error Suppression** - Filters out noisy console errors during disconnection  
✅ **Auto-Reload** - Reloads page when circuit expires or deployment completes  
✅ **Network-Aware** - Re-polls when browser comes back online

## Configuration

### Basic Configuration

```javascript
window.blazorReconnectionConfig = {
    // Status endpoint (use Azure Blob Storage for reliability during deployments)
    statusUrl: 'https://storage.blob.core.windows.net/status/reconnection-status.json',
    
    // Enable status checking
    checkStatus: true,
    
    // Polling intervals
    statusPollInterval: 5000,     // Fast polling during deployment (5s)
    normalPollInterval: 60000,    // Normal polling (60s)
    
    // UI customization
    primaryColor: '#594AE2',
    successColor: '#4CAF50'
};
```

### Custom UI

```javascript
window.blazorReconnectionConfig = {
    deploymentHtml: `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.9); 
                    display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 3rem; border-radius: 12px; text-align: center;">
                <h2>🚀 Deploying Updates</h2>
                <p>We'll be right back!</p>
            </div>
        </div>
    `,
    
    reconnectingHtml: `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); 
                    display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center;">
                <h3>Connection Lost</h3>
                <p>Reconnecting...</p>
                <button id="manual-reload-btn">Reload Now</button>
            </div>
        </div>
    `,
    
    versionUpdateMessage: 'A new version is available! Refresh to update.',
    
    customCss: `
        @keyframes spin { to { transform: rotate(360deg); } }
    `
};
```

## Status File Schema

The overlay polls a JSON status file. Host this on **Azure Blob Storage** (or similar) so it stays accessible during deployments.

```json
{
    "version": "1.2.0",
    "commit": "abc1234def5678",
    "status": "normal",
    "reconnectingMessage": "Connection lost. Reconnecting...",
    "deploymentMessage": null,
    "features": [],
    "estimatedDurationMinutes": null
}
```

### During Deployment

```json
{
    "version": "1.2.0",
    "commit": "abc1234def5678",
    "incomingCommit": "new5678commit",
    "status": "deploying",
    "deploymentMessage": "We're deploying new features! 🚀",
    "features": [
        "Performance improvements",
        "New dashboard"
    ],
    "estimatedDurationMinutes": 3
}
```

### Deployment Phases

- `preparing` - 🔧 Build started, containers being prepared
- `deploying` - 🚀 New container revision being created
- `verifying` - 🔍 Health checks on new revision
- `switching` - 🔄 Traffic switch to new version in progress
- `maintenance` - 🛠️ Scheduled maintenance
- `normal` - ✅ Everything is running normally

## Azure Blob Storage Setup

Since your Blazor Server app is down during deployment, host the status file on Blob Storage:

```bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'stmyappstatus'
  properties: { allowBlobPublicAccess: true }
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: 'deployment-status'
  properties: { publicAccess: 'Blob' }
}
```

### GitHub Actions Integration

```yaml
- name: Set deploying status
  run: |
    echo '{"version":"${{ github.sha }}","status":"deploying","deploymentMessage":"Deploying..."}' > status.json
    az storage blob upload --account-name stmyappstatus --container-name deployment-status \
      --name reconnection-status.json --file status.json --overwrite

- name: Deploy Blazor App
  # ... your deployment steps

- name: Set normal status
  run: |
    echo '{"version":"${{ github.sha }}","status":"normal"}' > status.json
    az storage blob upload --account-name stmyappstatus --container-name deployment-status \
      --name reconnection-status.json --file status.json --overwrite
```

## Local Development

When running on **localhost**, the handler automatically tries `/reconnection-status.dev.json` first:

```json
// wwwroot/reconnection-status.dev.json
{
    "version": "dev",
    "status": "deploying",
    "deploymentMessage": "🛠️ Testing deployment UI",
    "features": ["Test feature 1", "Test feature 2"]
}
```

## Testing API

Open browser DevTools console:

```javascript
// View current status
BlazorReconnectionTest.status()

// Force refresh status from server
await BlazorReconnectionTest.refreshStatus()

// Test version banner
BlazorReconnectionTest.showVersionBanner('2.0.0')
BlazorReconnectionTest.hideVersionBanner()

// Test deployment overlay
BlazorReconnectionTest.showDeployment()
BlazorReconnectionTest.hideDeployment()
```

## Migration from Previous Version

If you were using the older version with `autostart="false"`:

### Before (complex)
```razor
<script src="_framework/blazor.web.js" autostart="false"></script>
<CircuitReconnectionHandler @rendermode="InteractiveServer" />
```

### After (simple)
```razor
<script src="_framework/blazor.web.js"></script>
<script src="_content/TheNerdCollective.Components.BlazorServerCircuitHandler/js/blazor-reconnect.js"></script>
```

That's it! Remove `autostart="false"`, remove the component, just load the script.

## Dependencies

- .NET 10.0+
- Blazor Server (InteractiveServer render mode)
- MudBlazor 8.15+ (optional, but recommended)

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## License

MIT License - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective](https://www.thenerdcollective.dk/)

By [Jan Hjørdie](https://github.com/janhjordie/) - [LinkedIn](https://www.linkedin.com/in/janhjordie/) | [Dev.to](https://dev.to/janhjordie)
