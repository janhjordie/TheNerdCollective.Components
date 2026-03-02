# Reconnection Requirements & Behaviour Specification

**Package**: `TheNerdCollective.Blazor.Reconnect`  
**Last updated**: 2026-03-02

---

## Background — How Blazor Server Reconnection Works

Blazor Server maintains a persistent SignalR **circuit** between the browser and the server. Every interactive component, event handler and render tree lives inside this circuit. When the connection is lost, Blazor attempts to reconnect to the **same circuit** using the circuit ID it stored internally in session storage.

### Circuit lifecycle

```
Browser connects → circuit created (ID assigned)
        │
        ▼
Connection lost (network drop, app backgrounded, server restart…)
        │
        ▼
Blazor enters reconnect loop (retries × interval)
        │
   ┌────┴──────────────┐
   │                   │
   ▼                   ▼
Reconnect succeeds   Retries exhausted
(circuit still alive  (circuit expired OR server restarted)
 on server)
   │                   │
   ▼                   ▼
Resume seamlessly   failed() fired → show failed UI → user reloads
(no state lost)     (new circuit created after reload)
```

### Server-side circuit lifetime

The server holds a **disconnected circuit** in memory for a configurable idle timeout:

```csharp
// In Program.cs / AddRazorComponents()
builder.Services.AddServerSideBlazor(options =>
{
    options.DisconnectedCircuitMaxRetained = 100;
    options.DisconnectedCircuitRetentionPeriod = TimeSpan.FromMinutes(3); // default
});
```

If the user reconnects within this window → seamless resume.  
If the window expires → the circuit is garbage-collected → reconnect attempt hits a dead circuit → `failed()`.

---

## Scenario Requirements

### 1. Mobile — App Backgrounded (iPhone / Android)

**Trigger**: User opens the site in Safari/Chrome, switches to another app (Maps, Messages, etc.), returns to the browser after an indeterminate time.

**What happens on the OS level**:
- iOS Safari freezes JavaScript execution when the browser is backgrounded after ~30 seconds.
- The WebSocket (SignalR) connection is dropped by iOS, typically within 30s–2 minutes of backgrounding.
- When the user returns, the browser tab is resumed — JS execution restarts from where it froze.

**Expected behaviour**:

| Time away | Result |
|---|---|
| < ~3 min (within `DisconnectedCircuitRetentionPeriod`) | Reconnect modal appears briefly, then **auto-hides** as Blazor reconnects to the existing circuit. No state lost. |
| > ~3 min | Reconnect modal appears → retries exhaust → **failed UI** shown with "Reload page" button. User must reload; a new circuit starts. |

**Requirements**:
- [ ] Reconnect modal **must appear immediately** when the user returns to the tab (within the 1s polling interval).
- [ ] If reconnect succeeds, modal **must disappear** without user interaction.
- [ ] If retries exhaust, modal **must switch to the failed state** — do NOT auto-reload (the server may still be unreachable).
- [ ] `maxRetries` and `retryIntervalMilliseconds` must be configurable so the total retry window can be tuned to match `DisconnectedCircuitRetentionPeriod`.

**Recommended alignment**:
```
DisconnectedCircuitRetentionPeriod = 3 min
maxRetries = 8, retryIntervalMilliseconds = 3000  →  total ~24s retry window
```
This keeps the retry window short. If 24s is not enough, increase `maxRetries`.

---

### 2. Desktop — Tab Left Inactive

**Trigger**: User opens the site in a desktop browser, switches to another tab or window, or the computer sleeps/locks, for some period.

**What happens**:
- Desktop browsers throttle background tabs but generally do NOT freeze JS the way iOS does.
- WebSockets are kept alive by the OS TCP stack as long as the machine is not sleeping.
- If the machine sleeps, the TCP connection drops. On wake, the OS resumes the browser and SignalR's reconnect logic fires.

**Expected behaviour**: Identical to Mobile — see Scenario 1.

**Additional consideration**: Desktop browsers may not visually resurface the tab after sleep. The reconnect modal should be visible the moment the user clicks back to the tab.

---

### 3. Local Development — App Stop / Restart (dotnet run / hot reload)

**Trigger**: Developer stops `dotnet run` (Ctrl+C) or the watch recompiles, then starts the app again. The browser tab is still open.

**What happens**:
- Server process dies → WebSocket immediately drops → `components-reconnect-show` fires.
- All circuits are destroyed (server memory wiped) — **the circuit is 100% gone**.
- When the server is back, Blazor reconnects the SignalR transport, but the circuit no longer exists on the server.
- Blazor calls `failed()` after all retries are exhausted.

**Expected behaviour**:
- [ ] Reconnect modal appears immediately after the server stops.
- [ ] Retries run (developer waits for the server to restart).
- [ ] If the server comes back **within the retry window**, BUT the circuit is dead, the `failed()` path must trigger.
  - Note: Blazor will successfully reconnect the SignalR transport, then immediately fail the circuit negotiation → `failed()` is correct here.
- [ ] Failed modal appears → developer reloads → fresh circuit starts.

**Known issue**: When `maxRetries` is small (e.g., 8), the retry window may close before the server has restarted after a recompile. The developer then sees the failed UI and manually reloads, which is the correct and expected behaviour in local dev.

**Optional future enhancement**: During local dev (`ASPNETCORE_ENVIRONMENT=Development`), the app could expose a `/health` endpoint. The failed modal could poll it and show a "Server is back — reload?" prompt automatically.

---

### 4. Network Drop — WiFi → Mobile Data Switch (or complete outage)

**Trigger**: User loses WiFi and the device switches to mobile data, or there is a brief complete outage.

**Expected behaviour**:
- [ ] Reconnect modal appears when SignalR drops.
- [ ] If network is restored and circuit is still alive → auto-hide on successful reconnect.
- [ ] If network outage was long enough to expire the circuit → failed modal.

---

### 5. Server Deployment (New Version)

**Trigger**: A new version of the app is deployed while users are connected.

**Handled by**: `TheNerdCollective.Blazor.VersionMonitor` — shows a "new version available" banner.  
**Also handled by**: `blazor-reconnect.js` error suppression, which detects `The list of component operations is not valid` and triggers a reload.

This scenario is **out of scope** for the reconnect handler's modal UI.

---

## Circuit ID Access

### From JavaScript

Blazor Server does **not** expose the circuit ID in a public JavaScript API. Internally it stores reconnection state in `sessionStorage` (key: `_blazor-reconnect`), but the format is private and subject to change.

```js
// ❌ Not recommended — private/fragile internal API
window.Blazor._internal.navigationManager.getCircuitId?.()
```

**Conclusion**: Do not attempt to read or persist the circuit ID from JavaScript.

### From C# (server-side)

On the server, the circuit ID is available via `ICircuitAccessor`:

```csharp
using Microsoft.AspNetCore.Components.Server.Circuits;

public class MyService
{
    private readonly ICircuitAccessor _circuitAccessor;

    public MyService(ICircuitAccessor circuitAccessor)
    {
        _circuitAccessor = circuitAccessor;
    }

    public string GetCircuitId() => _circuitAccessor.Circuit?.Id ?? "(no circuit)";
}
```

This is useful for **server-side logging, diagnostics, and analytics** (e.g. correlating SignalR logs with application logs).

### Is "reconnect to last known circuit" something we need to implement?

**No.** Blazor Server handles this automatically:

1. On first connect, Blazor creates a circuit and stores its reconnection token in the browser's `sessionStorage`.
2. On every reconnect attempt, the browser sends this token back to the server.
3. If the server finds the circuit → resumes it seamlessly.
4. If not (token is stale, circuit was GC'd, server restarted) → negotiation fails → `failed()` fires.

The reconnect handler only needs to:
- Show the reconnecting UI while Blazor is retrying.
- Show the failed UI when retries are exhausted.
- Hide the UI when reconnection succeeds.

There is no action we can take to "reconnect to a specific circuit" from the client side — that is entirely a server-side decision based on whether the circuit is still alive.

---

## Configuration Reference

| Option | Default | Description |
|---|---|---|
| `maxRetries` | `8` | Max retry attempts before `failed()` fires. Cap on Blazor's default. |
| `retryIntervalMilliseconds` | `3000` | ms between attempts. `maxRetries × interval` = total retry window. |
| `title` | `Connection lost` | Reconnecting modal heading. |
| `subtitle` | `The connection was interrupted…` | Reconnecting modal body text. |
| `statusText` | `Reconnecting…` | Reconnecting modal sub-status. |
| `reloadButtonText` | `Reload now` | Button label in reconnecting modal. |
| `failedTitle` | `Unable to reconnect` | Failed modal heading. |
| `failedSubtitle` | `The connection to the server could not be restored.` | Failed modal body. |
| `failedReloadButtonText` | `Reload page` | Button label in failed modal. |
| `logoUrl` | `null` | Logo URL shown above spinner/error icon. |
| `primaryColor` | `#594AE2` | Button and spinner colour. |
| `reconnectingHtml` | `null` | Full HTML override for the reconnecting state. |
| `failedHtml` | `null` | Full HTML override for the failed state. |

### Tuning the retry window to match server idle timeout

```js
// 3-minute server idle timeout (DisconnectedCircuitRetentionPeriod)
// Keep retry window short — let the failed UI appear fast if server is gone.
// If server is reachable but circuit is dead, failed() fires immediately anyway.
window.blazorReconnectConfig = {
    maxRetries: 8,                    // 8 × 3s = 24s total retry window
    retryIntervalMilliseconds: 3000
};

// For local dev where you want to wait for a slow recompile:
window.blazorReconnectConfig = {
    maxRetries: 30,                   // 30 × 4s = 2 min — enough for most recompiles
    retryIntervalMilliseconds: 4000
};
```

---

## Open Questions / Future Work

- [ ] **Dev environment "server is back" detection**: In `Development`, poll a `/health` endpoint from the failed modal and offer an auto-reload when the server responds. Config option: `autoRetryAfterFailedMs` (e.g. 5000) to re-attempt after the failed state.
- [ ] **Expose `onReconnecting` / `onReconnected` / `onFailed` JS callbacks** so host apps can add custom telemetry or analytics.
- [ ] **Persist `circuitId` server-side** (via `CircuitHandler`) for session continuity diagnostics — log when a circuit is resumed vs. when a new one is created.
- [ ] **iOS PWA / Home Screen apps**: When added to the iOS home screen, the app runs in a standalone WebView. The backgrounding behaviour is more aggressive. Needs testing.
