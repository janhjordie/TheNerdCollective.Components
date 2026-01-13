# TheNerdCollective.Blazor.VersionMonitor

A lightweight version monitor for Blazor Server applications. Polls a status endpoint and notifies users when a new version is available.

## Features

✅ **Version Detection** - Polls status endpoint for version/commit changes  
✅ **Update Banner** - Non-intrusive notification when new version available  
✅ **Deployment Status** - Optional deployment phase awareness  
✅ **Network-Aware** - Re-polls when browser comes back online  
✅ **Local Dev Support** - Uses dev status file on localhost  
✅ **Customizable UI** - Configure colors, messages, and HTML

## Quick Start

### 1. Install the package

```bash
dotnet add package TheNerdCollective.Blazor.VersionMonitor
```

### 2. Create status endpoint

Create a JSON file at `/reconnection-status.json` (or host on Azure Blob Storage for reliability during deployments):

```json
{
    "version": "1.0.0",
    "commit": "abc1234",
    "status": "normal"
}
```

### 3. Add to App.razor

```razor
<body>
    <Routes @rendermode="InteractiveServer" />

    <!-- Optional: Configure before loading -->
    <script>
        window.blazorVersionMonitorConfig = {
            statusUrl: '/reconnection-status.json',
            pollInterval: 60000
        };
    </script>

    <script src="_framework/blazor.web.js"></script>
    
    <!-- Version monitor -->
    <script src="_content/TheNerdCollective.Blazor.VersionMonitor/js/blazor-version-monitor.js"></script>
</body>
```

## How It Works

```
┌────────────────────────────────────────────────────────────┐
│                    Version Monitor                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. On page load, fetch status and store commit/version     │
│                         ↓                                   │
│  2. Poll status endpoint every N seconds                    │
│                         ↓                                   │
│  3. If commit/version changed → show banner                 │
│     User clicks "Update" → page reloads                     │
│     User clicks "Later" → banner dismissed                  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Configuration

```javascript
window.blazorVersionMonitorConfig = {
    // Status endpoint (use Azure Blob Storage for reliability during deployments)
    statusUrl: '/reconnection-status.json',
    
    // Enable/disable monitoring
    enabled: true,
    
    // Polling interval in milliseconds
    pollInterval: 60000,     // Normal polling (60s)
    fastPollInterval: 5000,  // During deployment (5s)
    
    // UI customization
    primaryColor: '#594AE2',
    versionUpdateMessage: 'A new version is available! Refresh to update.',
    
    // Custom banner HTML (completely replace default)
    bannerHtml: null
};
```

### Custom Banner Example

```javascript
window.blazorVersionMonitorConfig = {
    bannerHtml: `
        <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                    background: #4CAF50; color: white; padding: 1rem 2rem; 
                    border-radius: 8px; z-index: 9998;">
            <span>New version available!</span>
            <button id="version-reload-btn" style="margin-left: 1rem;">Update</button>
            <button id="version-dismiss-btn" style="margin-left: 0.5rem;">×</button>
        </div>
    `
};
```

> **Note:** Include buttons with `id="version-reload-btn"` and `id="version-dismiss-btn"` for the update/dismiss functionality.

## Status File Schema

```json
{
    "version": "1.2.0",
    "commit": "abc1234def5678",
    "status": "normal",
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

When running on localhost, the monitor automatically tries `/reconnection-status.dev.json` first:

```json
// wwwroot/reconnection-status.dev.json
{
    "version": "dev",
    "commit": "local",
    "status": "normal"
}
```

## Testing API

Open browser DevTools console:

```javascript
// View current status
BlazorVersionMonitor.status()

// Force refresh status from server
await BlazorVersionMonitor.refreshStatus()

// Manually show/hide version banner
BlazorVersionMonitor.showBanner('2.0.0')
BlazorVersionMonitor.hideBanner()
```

## Used With

For circuit reconnection UI, use the companion package:
- **[TheNerdCollective.Blazor.Reconnect](https://www.nuget.org/packages/TheNerdCollective.Blazor.Reconnect)**

## Dependencies

- .NET 10.0+
- Blazor Server (InteractiveServer render mode)

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## License

Apache-2.0 License - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective](https://www.thenerdcollective.dk/)

By [Jan Hjørdie](https://github.com/janhjordie/) - [LinkedIn](https://www.linkedin.com/in/janhjordie/) | [Dev.to](https://dev.to/janhjordie)
