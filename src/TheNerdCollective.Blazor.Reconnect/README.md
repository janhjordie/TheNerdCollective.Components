# TheNerdCollective.Blazor.Reconnect

A lightweight, project-agnostic Blazor Server circuit reconnection handler. Works out of the box with sensible English defaults and is fully customisable for branding, localisation, and styling.

## Features

✅ **Zero config** — drop in one `<script>` tag and it just works  
✅ **Project-agnostic** — neutral English defaults, all text is configurable  
✅ **Custom branding** — add your logo, brand colour, and CSS in seconds  
✅ **Non-invasive** — Blazor starts normally, no `autostart="false"` required  
✅ **Reliable** — hooks `Blazor.defaultReconnectionHandler` (official API) with 250ms polling fallback  
✅ **Auto-reload** — reloads when circuit permanently expires  
✅ **Error suppression** — filters noisy console errors during disconnection  
✅ **Full override** — supply your own modal HTML for complete control

## Quick Start

### 1. Install the package

```bash
dotnet add package TheNerdCollective.Blazor.Reconnect
```

### 2. Add to App.razor

```razor
<head>
    <!-- Suppress Blazor's built-in reconnect overlay -->
    <style>#components-reconnect-modal { display: none !important; }</style>
</head>
<body>
    <Routes @rendermode="InteractiveServer" />

    <!-- Blazor starts normally (no autostart="false" needed) -->
    <script src="_framework/blazor.web.js"></script>

    <!-- Reconnection handler — works with zero config -->
    <script src="_content/TheNerdCollective.Blazor.Reconnect/js/blazor-reconnect.js"></script>
</body>
```

That's it. A clean "Connection lost" modal will appear whenever the circuit drops, and disappear automatically when it reconnects.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     Connection Lost                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Primary: Blazor.defaultReconnectionHandler hook            │
│  · Blazor calls show() → custom modal appears               │
│  · Blazor calls hide() → custom modal disappears            │
│  · Blazor calls failed() → reload after 2s                  │
│                                                             │
│  Fallback (if hook unavailable): DOM class polling          │
│  · Polls #components-reconnect-modal class every 250ms      │
│  · components-reconnect-show    → show modal                │
│  · components-reconnect-hide    → hide modal                │
│  · components-reconnect-failed  → reload after 2s           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

Set `window.blazorReconnectConfig` **before** loading the script:

```javascript
window.blazorReconnectConfig = {
    // ...options
};
```

### Full option reference

| Option | Type | Default | Description |
|---|---|---|---|
| `primaryColor` | `string` | `'#594AE2'` | Button and spinner colour |
| `logoUrl` | `string\|null` | `null` | URL to a logo shown above the spinner |
| `spinnerUrl` | `string\|null` | `null` | URL to a custom spinner image (replaces SVG) |
| `title` | `string` | `'Connection lost'` | Modal heading |
| `subtitle` | `string` | `'The connection was interrupted…'` | Sub-heading text |
| `statusText` | `string` | `'Reconnecting…'` | Small status line |
| `reloadButtonText` | `string` | `'Reload now'` | Manual reload button label |
| `customCss` | `string\|null` | `null` | Inline CSS injected into the modal |
| `customCssUrl` | `string\|null` | `null` | URL to an external stylesheet loaded with the modal |
| `reconnectingHtml` | `string\|null` | `null` | Completely replaces the built-in modal HTML |

---

## Branding Examples

### Add a logo and brand colour

```javascript
window.blazorReconnectConfig = {
    primaryColor: '#007bff',
    logoUrl: '/_content/MyApp/images/logo.png'
};
```

### Full branding with localisation

```javascript
window.blazorReconnectConfig = {
    primaryColor: '#E63946',
    logoUrl: '/images/logo.svg',
    title: 'Forbindelsen afbrudt',
    subtitle: 'Forsøger at genoprette forbindelsen…',
    statusText: 'Genopretter…',
    reloadButtonText: 'Genindlæs nu'
};
```

### Load a local CSS file for complete control

```javascript
window.blazorReconnectConfig = {
    customCssUrl: '/_content/MyApp/css/reconnect.css'
};
```

The stylesheet is injected into `<head>` once and stays for the page lifetime. Target `#blazor-reconnect-modal` and its children.

### Custom CSS inline (small tweaks)

```javascript
window.blazorReconnectConfig = {
    customCss: `
        #blazor-reconnect-modal h3 { font-family: 'Inter', sans-serif; }
    `
};
```

### Full HTML override

```javascript
window.blazorReconnectConfig = {
    reconnectingHtml: `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.8);
                    display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center;">
                <img src="/logo.svg" style="height: 48px; margin-bottom: 1rem;" />
                <h3>Connection Lost</h3>
                <p>Reconnecting…</p>
                <button id="manual-reload-btn">Reload Now</button>
            </div>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `
};
```

> **Note:** When using `reconnectingHtml`, include a `<button id="manual-reload-btn">` to keep the reload button functional.

---

## Testing API

Open browser DevTools console:

```javascript
BlazorReconnect.showModal()   // Force show the modal
BlazorReconnect.hideModal()   // Force hide the modal
BlazorReconnect.status()      // Log current state
```

---

## Used With

For version detection and update banners, use the companion package:
- **[TheNerdCollective.Blazor.VersionMonitor](https://www.nuget.org/packages/TheNerdCollective.Blazor.VersionMonitor)**

---

## Dependencies

- .NET 9.0+ / .NET 10.0+
- Blazor Server (`InteractiveServer` render mode)

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## License

Apache-2.0 — see LICENSE for details.

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective](https://www.thenerdcollective.dk/)

By [Jan Hjørdie](https://github.com/janhjordie/) — [LinkedIn](https://www.linkedin.com/in/janhjordie/) | [Dev.to](https://dev.to/janhjordie)
