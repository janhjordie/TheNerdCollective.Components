# TheNerdCollective.Blazor.Reconnect

A lightweight, non-invasive Blazor Server circuit reconnection handler with professional UI.

## Features

✅ **Non-Invasive** - Blazor starts normally, no `autostart="false"` required  
✅ **Professional UI** - Custom reconnection modal replaces Blazor's default  
✅ **Health Check** - Verifies server is responsive before giving up  
✅ **Auto-Reload** - Reloads page if server is healthy but circuit is stuck (after 10s)  
✅ **Error Suppression** - Filters noisy console errors during disconnection  
✅ **Circuit Expiry** - Auto-reloads when circuit expires

## Quick Start

### 1. Install the package

```bash
dotnet add package TheNerdCollective.Blazor.Reconnect
```

### 2. Add to App.razor

```razor
<body>
    <Routes @rendermode="InteractiveServer" />

    <!-- Optional: Configure before loading -->
    <script>
        window.blazorReconnectConfig = {
            primaryColor: '#594AE2',
            successColor: '#4CAF50'
        };
    </script>

    <!-- Blazor starts normally (no autostart=false needed!) -->
    <script src="_framework/blazor.web.js"></script>
    
    <!-- Reconnection handler -->
    <script src="_content/TheNerdCollective.Blazor.Reconnect/js/blazor-reconnect.js"></script>
</body>
```

## How It Works

```
┌────────────────────────────────────────────────────────────┐
│                    Connection Lost                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Blazor's default modal appears (#components-reconnect)  │
│                         ↓                                   │
│  2. This handler detects it via MutationObserver            │
│                         ↓                                   │
│  3. Hides default modal, shows custom UI                    │
│                         ↓                                   │
│  4. Starts 10-second health check timer                     │
│                         ↓                                   │
│  5. If Blazor reconnects → hide modal, done                 │
│     If server healthy but stuck → force reload              │
│     If server unreachable → keep retrying                   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Configuration

```javascript
window.blazorReconnectConfig = {
    // UI colors
    primaryColor: '#594AE2',
    successColor: '#4CAF50',
    
    // Custom spinner (optional - defaults to SVG spinner)
    spinnerUrl: null,
    
    // Custom CSS (appended to modal)
    customCss: null,
    
    // Custom HTML (completely replace default UI)
    reconnectingHtml: null
};
```

### Custom UI Example

```javascript
window.blazorReconnectConfig = {
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
    
    customCss: `
        @keyframes spin { to { transform: rotate(360deg); } }
    `
};
```

> **Note:** If you provide custom HTML, make sure to include a button with `id="manual-reload-btn"` for the reload functionality.

## Testing API

Open browser DevTools console:

```javascript
// Force show reconnect modal
BlazorReconnect.showModal()

// Hide reconnect modal
BlazorReconnect.hideModal()

// Check status
BlazorReconnect.status()
```

## Used With

For version detection and update banners, use the companion package:
- **[TheNerdCollective.Blazor.VersionMonitor](https://www.nuget.org/packages/TheNerdCollective.Blazor.VersionMonitor)**

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
