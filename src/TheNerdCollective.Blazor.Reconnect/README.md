# TheNerdCollective.Blazor.Reconnect

A lightweight, project-agnostic Blazor Server circuit reconnection handler. Works out of the box with sensible English defaults and is fully customisable for branding, localisation, and styling.

## Features

✅ **Zero config** — drop in one `<script>` tag and it just works  
✅ **Silent grace period** — no flash of reconnect UI on brief hiccups or quick wakes (configurable, default 500ms)  
✅ **Rapid-first backoff** — first retry is instant, then gradually backs off; matches Blazor's built-in strategy  
✅ **iOS/mobile aware** — handles screen lock, bfcache, and tab freeze correctly (see [iOS behaviour](#ios--mobile-behaviour))  
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
 Connection drops
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Grace period (default 500ms)                               │
│  Blazor retries silently in background.                     │
│  If hide() fires → timer cancelled, user sees nothing. ✅   │
└─────────────────────────┬───────────────────────────────────┘
                          │ timer expires
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1 — Circuit retry loop (rapid-first backoff)         │
│  · Retry at: 0ms, 500ms, 1s, 2s, 3s, 5s, 10s, 15s, 20s…   │
│  · Modal shown with countdown                               │
│  · hide() fires → modal dismissed, all timers cancelled     │
└─────────────────────────┬───────────────────────────────────┘
                          │ in parallel after 3s
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2 — Server-alive ping (parallel with Phase 1)        │
│  · Polls /health every 5s                                   │
│  · 2xx response → auto-reload (server is back)              │
│  · AbortController cancels in-flight fetch if circuit       │
│    reconnects during a ping                                 │
└─────────────────────────────────────────────────────────────┘

 Primary hook: Blazor.defaultReconnectionHandler._reconnectionDisplay
   · show()   → scheduleShowReconnectModal() (respects grace period)
   · hide()   → hideReconnectModal() (cancels grace period if active)
   · failed() → showFailedModal() (Phase 2 UI)

 Fallback: DOM class polling every 250ms
   · components-reconnect-show   → show
   · components-reconnect-hide   → hide
   · components-reconnect-failed → Phase 2 UI
```

---

## iOS / Mobile Behaviour

On **iOS Safari**, JavaScript is frozen when the user locks the screen or switches apps. The WebSocket (SignalR) is silently dropped by the OS. When the user returns to the browser, JS resumes — but what happens next depends on how long the screen was locked:

### Scenario A — Short lock (< ~60s, no memory pressure)

iOS freezes JS but keeps the WKWebView alive. When the user returns:
1. `visibilitychange` fires (`document.visibilityState === 'visible'`)
2. This library immediately calls **`Blazor.reconnect()`** in parallel with a health ping
3. If the circuit is still alive on the server, reconnect resolves in ~200–500ms
4. The grace period absorbs the reconnect — **the user sees no modal at all**

### Scenario B — Long lock or memory pressure (the common case)

iOS kills the WKWebView process entirely to reclaim memory. This typically happens after 1–3 minutes, or sooner on older/low-memory devices. When the user returns to Safari:

- The browser performs a **full page navigation (reload)** — it is not a reconnect
- Blazor starts fresh with a new circuit
- The reconnect handler is never involved — the page simply loads from scratch as normal

> **This is why it "always feels like a reload" on iPhone.** It is one — and that is correct behaviour. There is no circuit to recover. The OS made that decision, not the browser or Blazor.

There is nothing a reconnect handler can do about Scenario B. The only mitigation is preserving user state across page loads (e.g. URL state, `localStorage`, server-side session).

### Scenario C — bfcache (back/forward swipe navigation)

If the user navigates away and back using Safari's swipe gestures, the page may be restored from the **back-forward cache (bfcache)**. The page appears instantly, but all Blazor state is dead-on-arrival (the SignalR connection no longer exists).

This library handles this with the `pageshow` event:

```javascript
window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
});
```

A persisted `pageshow` triggers an immediate reload so the user gets a fully working circuit.

### How fast can Blazor Server reconnect?

When a reconnect is possible (Scenario A), the process requires:
1. Re-establish the WebSocket handshake
2. `ConnectCircuit` server invocation — validates the circuit is still alive in server memory

**Total: ~200–500ms on a good connection.** The server-side circuit stays alive for the `DisconnectedCircuitRetentionPeriod` (default: 3 minutes). If the circuit has expired, `ConnectCircuit` returns `false`, Blazor calls `failed()`, and Phase 2 triggers a reload.

### Summary table

| Scenario | iOS action | Library response |
|---|---|---|
| Short lock (< ~60s) | JS frozen, WKWebView alive | `visibilitychange` → `Blazor.reconnect()` + ping → silent recovery |
| Long lock / memory pressure | WKWebView killed | Full page reload by Safari — circuit starts fresh |
| bfcache (swipe back/forward) | Page restored from cache | `pageshow` persisted → forced `location.reload()` |

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
| `showDelayMilliseconds` | `number` | `500` | **Grace period**: how long to wait silently after the circuit drops before showing the modal. During this window Blazor is already retrying in the background. If the circuit reconnects within the grace period, no modal is ever shown. Set to `0` for old immediate behaviour. |
| `maxRetries` | `number` | `1000` | Max Phase 1 retry attempts (Phase 2 server ping is the real exit) |
| `retryIntervalMilliseconds` | `number\|number[]` | `[0,500,1000,2000,3000,5000,10000,15000,20000,30000]` | Retry interval(s) in ms. An array enables rapid-first backoff (recommended). A plain number uses a flat interval. |
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
BlazorReconnect.status()         // Log full current state (modal, grace period, pings…)
BlazorReconnect.showModal()      // Trigger modal with grace period (as if circuit dropped)
BlazorReconnect.showModalNow()   // Show modal immediately, bypassing grace period
BlazorReconnect.hideModal()      // Dismiss modal (as if circuit reconnected)
BlazorReconnect.showFailedModal() // Jump straight to Phase 2 (server ping) UI
BlazorReconnect.stopServerPing() // Stop the Phase 2 ping loop
BlazorReconnect.immediatePing()  // Simulate a visibility-restore health check
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
