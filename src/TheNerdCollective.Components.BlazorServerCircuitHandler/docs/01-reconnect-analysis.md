# Reconnect System Analysis
**Date: 2026-03-02 | Status: ✅ All bugs fixed — 2026-03-02**

---

## Two Implementations in Parallel

There are **two separate JS files** doing the same job:

| File | Component | Used by |
|------|-----------|---------|
| `TheNerdCollective.Blazor.Reconnect/wwwroot/js/blazor-reconnect.js` | TheNerdCollective.Blazor.Reconnect | ServerWeb, ServerAdmin |
| `TheNerdCollective.Components.BlazorServerCircuitHandler/wwwroot/js/blazor-reconnect.js` | TheNerdCollective.Components.BlazorServerCircuitHandler | ServerWeb, ServerAdmin |

Both projects are referenced in `ServerAdmin.csproj` and `ServerWeb.csproj`, meaning **both JS files are loaded on every page**. This causes double-registration of `MutationObserver`, double `console.error` patching, double health check timers, and potentially race conditions between the two overlapping event handlers.

---

## Bug 1 — PRIMARY: Modal Never Hides After Reconnect

**Symptom:** The app comes back alive (Blazor reconnects), but the reconnect modal stays visible until the page is reloaded manually.

**Root cause in the observer:**

```js
const observer = new MutationObserver(async () => {
    const defaultModal = document.getElementById('components-reconnect-modal');
    
    if (defaultModal && ...) {
        // Show our modal
    } else if (!defaultModal && reconnectModal) {
        // Hide our modal   ← THIS NEVER FIRES
    }
});

observer.observe(document.body, { childList: true, subtree: true });
```

The observer uses `childList: true` — it only fires when **elements are added or removed**. But Blazor does NOT remove `#components-reconnect-modal` when it reconnects. Instead, Blazor **changes the CSS class** on the element:

- Disconnected: `class="components-reconnect-show"`
- Reconnected: `class="components-reconnect-hide"`

Class changes are **attribute mutations** (`attributes: true`), not childList mutations. Since the observer is only watching `childList`, it never sees the hide transition, so `!defaultModal && reconnectModal` never evaluates to true, and `hideReconnectModal()` is never called.

**Fix required:**
- Change observer to `{ childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }`
- Change the hide condition to check `defaultModal.classList.contains('components-reconnect-hide')` instead of `!defaultModal`

---

## Bug 2 — iPhone/Safari: Forces Reload Too Quickly

**Symptom:** On iPhone, switching away from Safari and returning shows the reconnect modal. The modal never hides, and after ~10 seconds the page fully reloads — losing state.

**What happens:**
1. iOS suspends the tab aggressively, killing the WebSocket within 1-3 seconds
2. Blazor detects disconnection and shows `#components-reconnect-modal`
3. Our observer shows the custom reconnect modal and starts `startReconnectHealthCheck()`
4. The health check fires after **10 seconds**:
   ```js
   reconnectTimeout = setTimeout(async () => {
       const response = await fetch('/_blazor/negotiate?...', { method: 'POST' });
       if (response.ok) {
           window.location.reload();  // ← forces reload
       }
   }, 10000);
   ```
5. The server is healthy, so `/_blazor/negotiate` returns `200 OK`
6. **Page is force-reloaded** — even though Blazor may have been mid-reconnect

**The correct behavior:** Blazor's default reconnect has up to ~30 seconds of retry time (configurable via `withUrl().withAutomaticReconnect()`). The 10-second hard reload cuts this short.

Even if Blazor does successfully reconnect (circuit reused), Bug 1 means the modal stays up regardless. The user assumes it's broken and waits until the health check force-reloads. This creates the experience of "it seems to reload instead of reconnecting."

**Fix required:**
- Remove the health-check-based force reload entirely, OR push the timeout to 30+ seconds
- Rely on Blazor's own reconnect lifecycle instead of second-guessing it
- For iOS specifically, the session state IS lost after a circuit reconnect because the server-side circuit timeout is typically 30s — if the user returns after >30s, a new circuit is created. This is correct and expected behavior for Blazor Server. The UX should say "Siden genindlæses" instead of "Genopretter forbindelsen..." when a full reload occurs.

---

## Bug 3 — `deploymentOverlay` Referenced But Never Declared

**In `BlazorServerCircuitHandler/wwwroot/js/blazor-reconnect.js` around line 390:**

```js
if (defaultModal && !isInitialLoad && !reconnectModal && !deploymentOverlay) {
```

`deploymentOverlay` is never declared with `let`/`const`/`var`. In strict mode (`'use strict'` is at the top), accessing an undeclared variable throws a `ReferenceError`. The IIFE uses `'use strict'`.

This means the `MutationObserver` callback throws on every DOM mutation while the modal check runs, preventing any reconnect modal from appearing at all in the `BlazorServerCircuitHandler` implementation.

**Fix required:** Add `let deploymentOverlay = null;` to the STATE declarations section.

---

## Bug 4 — `configureBlazorReconnection` Does Not Exist

**In `CircuitReconnectionHandler.razor`:**

```csharp
await JS.InvokeVoidAsync("configureBlazorReconnection", config);
```

**In the JS file:** No such global function is defined. The config is consumed via:

```js
...(window.blazorReconnectionConfig || {})
```

This runs at IIFE execution time (script load), **before Blazor renders the component**, so `window.blazorReconnectionConfig` is always `undefined` at that point. The subsequent C# call to `configureBlazorReconnection` throws a JavaScript interop error:

> `Microsoft.JSInterop.JSException: Could not find 'configureBlazorReconnection' in 'window'`

This means all parameter customization (`PrimaryColor`, `SpinnerUrl`, `ReconnectingHtml`, etc.) has **never worked**. The component always runs with hardcoded defaults.

**Fix required:**
- Either expose `window.configureBlazorReconnection = function(cfg) { ... }` in the JS
- Or populate `window.blazorReconnectionConfig` before script load via a script block in `App.razor`/`_Host.cshtml`

---

## Bug 5 — Double Loading of Both Components

Both `ServerAdmin.csproj` and `ServerWeb.csproj` reference both projects:

```xml
<ProjectReference Include="TheNerdCollective.Blazor.Reconnect" />
<ProjectReference Include="TheNerdCollective.Components.BlazorServerCircuitHandler" />
```

If both scripts are loaded (depends on how they're registered), **two independent MutationObservers** watch `document.body`, and `console.error` is patched twice. The second patch wraps the already-patched function. This is likely not causing visible bugs, but it is unnecessary overhead and complexity.

**Recommendation:** Pick one implementation and remove the other. `BlazorServerCircuitHandler` is the more complete implementation (has deployment overlays, version banners, status polling). `TheNerdCollective.Blazor.Reconnect` is a simplified subset of the same logic.

---

## How Blazor Server Reconnection Actually Works

Understanding the lifecycle to fix correctly:

```
1. Circuit disconnects → Blazor adds #components-reconnect-modal with class "components-reconnect-show"
2. Blazor retries WebSocket (exponential backoff, up to ~30 seconds)
3a. Reconnect success → Blazor changes class to "components-reconnect-hide"
3b. Reconnect failure → Blazor changes class to "components-reconnect-failed"
    → "components-reconnect-failed" means the circuit is gone (expired or closed)
    → Only here should we force a reload
```

The correct integration point is watching the **class attribute** on `#components-reconnect-modal`:
- `components-reconnect-show` → show overlay
- `components-reconnect-hide` → hide overlay, circuit recovered ✅
- `components-reconnect-failed` → reload, circuit is dead ⚠️

---

## iPhone / Safari Behavior Summary

| Scenario | What happens | Expected? |
|----------|-------------|-----------|
| Switch away < 30s, return | Circuit is alive on server, Blazor reconnects | Should restore session without reload |
| Switch away > 30s, return | Circuit has expired server-side, Blazor fails → reload | Correct — reload is expected |
| iOS kill (swipe up, etc.) | Same as > 30s: full reload | Correct |

Currently both scenarios result in a reload due to Bug 1 (modal never hides) + Bug 2 (10s force-reload). The short-background case (< 30s) should be recoverable without reload but currently isn't.

---

## Priority Summary

| # | Bug | Impact | Fix complexity |
|---|-----|--------|---------------|
| 1 | Observer watches wrong event type | Critical — modal never auto-hides | Low |
| 2 | 10s health check forces early reload on mobile | High — bad UX on iPhone | Low |
| 3 | `deploymentOverlay` undeclared (strict mode) | High — JS throws in observer | Trivial |
| 4 | `configureBlazorReconnection` missing | Medium — customization broken | Low |
| 5 | Both packages loaded in same app | Low — overhead, not visible | Medium (consolidate) |
