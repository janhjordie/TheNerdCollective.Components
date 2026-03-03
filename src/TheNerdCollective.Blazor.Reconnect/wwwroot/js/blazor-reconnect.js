/**
 * Blazor Server Reconnection Handler
 * TheNerdCollective.Blazor.Reconnect v1.10.0
 *
 * Silent-first design: the modal is NEVER shown within the first 5 seconds.
 * During this window Blazor retries the circuit AND the /health endpoint is polled
 * immediately. If either succeeds the user sees nothing — no flash, no disruption.
 * The modal only appears if 5 seconds elapse with no recovery, which reliably
 * indicates a genuine server restart / deployment rather than a momentary hiccup.
 *
 * NEW in v1.10.0: requireFailedPingBeforeModal (default false).
 *   When true, the modal is further suppressed until at least one /health ping
 *   returns non-2xx or a network error. On always-on deployments (ACA, Railway…)
 *   /health responds in < 200ms — a 2xx fires safeReload() silently BEFORE the 5s
 *   grace expires and the modal is never reached in the first place.
 *   Set requireFailedPingBeforeModal=true to make the modal ONLY appear on genuine
 *   outages where the server is actually failing health checks.
 *
 * - Silent grace period (showDelayMilliseconds, default 5000ms): modal is held
 *            back while Blazor retries + Phase 2 ping run in background.
 *            If reconnected / reloaded within 5s → completely invisible to user.
 * - Phase 1: Blazor circuit retry loop (effectively infinite — maxRetries=1000)
 * - Phase 2: server-alive ping starts IMMEDIATELY (serverPingStartDelayMs=0) the
 *            instant the circuit drops, in parallel with Phase 1. AbortController
 *            cancels any in-flight fetch the instant Blazor reconnects the circuit.
 *            circuitReconnected guard prevents reload if hide() fires just before
 *            a ping response lands. A 2xx during the grace period triggers a reload
 *            before the modal is ever shown.
 * - visibilitychange: ALWAYS calls Blazor.reconnect() on visibility restore.
 *            Sets wokenFromVisibility=true for diagnostics. If disconnect already
 *            visible, fires an additional immediate one-shot ping.
 * - window.focus: ALWAYS calls Blazor.reconnect() when the browser WINDOW regains
 *            focus (desktop alt-tab / minimise). Covers the gap where visibilitychange
 *            does not fire because the tab was already selected.
 * - Page Lifecycle API (Chrome 68+, Android Chrome):
 *            'freeze' → saves scroll before the tab is frozen to save memory.
 *            'resume' → calls Blazor.reconnect() before visibilitychange fires,
 *            collapsing recovery time by one round trip on Android Chrome.
 * - pageshow (persisted): iOS bfcache — reloads immediately for a fresh circuit.
 * - Polls Blazor's reconnect state every 250ms (reliable, no MutationObserver races)
 * - Re-hooks Blazor's reconnectionHandler every 5s so it survives server restarts
 * - Suppresses noisy console errors during disconnection
 * - Lifecycle callbacks: onReconnecting / onReconnected / onFailed / onServerBack
 * - safeReload(): all programmatic reloads save scroll position first
 * - prefers-reduced-motion: spinner animation paused for motion-sensitive users
 *
 * Platform trigger coverage:
 *   Desktop browser  — visibilitychange (tab switch) + window.focus (alt-tab/minimise)
 *   Android Chrome   — visibilitychange + Page Lifecycle resume (1 RTT faster)
 *   iOS Safari       — visibilitychange + pageshow bfcache guard
 *   iOS PWA          — visibilitychange + pageshow
 *   Network restore  — online event → immediate health check
 *
 * Timeline for any disconnect:
 *   0ms      — circuit drops, Blazor fires show()
 *   0ms      — Phase 2 /health ping starts immediately
 *   0–4999ms — Blazor retries + /health polling; user sees nothing
 *              If hide() fires → modal cancelled, done ✅
 *              If /health 2xx → safeReload() (scroll saved), done ✅
 *   5000ms   — grace period expires → modal shown
 *              (only reached if server is genuinely down / deploying)
 *
 * Works with Blazor's default startup (no autostart="false" needed!)
 *
 * Usage:
 *   <script src="_framework/blazor.web.js"></script>
 *   <script src="_content/TheNerdCollective.Blazor.Reconnect/js/blazor-reconnect.js"></script>
 *
 * Optional config (set BEFORE loading this script):
 *   window.blazorReconnectConfig = { primaryColor: '#007bff', logoUrl: '/_content/MyApp/logo.png' };
 */

(() => {
    'use strict';
    
    // ===== CONFIGURATION =====
    const config = {
        // Colors (used in the default built-in UI)
        primaryColor: '#594AE2',

        // Branding
        logoUrl: null,         // URL to a logo shown above the spinner (e.g. '/_content/MyApp/logo.png')
        spinnerUrl: null,      // URL to a custom spinner image — replaces the SVG spinner

        // Grace period: how long to wait before showing the modal after the circuit drops.
        // During this window Blazor retries + Phase 2 /health ping run in background.
        // If reconnected or reloaded within this window the user sees nothing at all.
        // Default 5000ms: covers typical server restarts and iOS screen-lock wakes.
        // Set to 0 to show the modal immediately.
        showDelayMilliseconds: 5000,

        // Phase 1: circuit retry behaviour (effectively infinite — Phase 2 is the real exit)
        maxRetries: 1000,                 // Effectively infinite: Phase 2 (server ping) triggers reload, not retry exhaustion
        // Retry interval: use Blazor's rapid-then-backoff default pattern.
        // Array.prototype.at.bind([...]) returns undefined after the last entry → retries stop.
        // [0]      = immediate first retry (Blazor fires this before show() in most cases,
        //            but having 0 here ensures the first UI-visible attempt is instant)
        // [500]    = 500ms   (within grace period, invisible to user)
        // [1000]   = 1s
        // [2000]   = 2s
        // [3000]   = 3s
        // [5000…]  = 5s, 10s … (long-tail / server restart scenario)
        // If you prefer a flat interval, set retryIntervalMilliseconds to a number (e.g. 2000)
        // instead of the array form.
        retryIntervalMilliseconds: [0, 500, 1000, 2000, 3000, 5000, 10000, 15000, 20000, 30000],

        // Phase 2: server-alive polling — starts IN PARALLEL with Phase 1 after a short delay.
        // If the server responds while Phase 1 is still running, reload immediately.
        serverPingEnabled: true,
        serverPingUrl: '/health',                   // Any 2xx response triggers reload
        serverPingStartDelayMilliseconds: 0,        // Start pinging immediately when the circuit drops.
                                                    // stopServerPing() uses AbortController to cancel any
                                                    // in-flight fetch the instant Blazor reconnects.
        serverPingIntervalMilliseconds: 2000,       // ms between ping attempts (fast polling inside grace period)
        autoReloadOnServerBack: true,               // true = auto-reload; false = show a prompt

        // When true: the reconnect modal is suppressed until at LEAST ONE /health ping has
        // returned non-2xx (or a network error). This is the recommended setting for
        // always-on deployments (Azure Container Apps, Railway, Fly.io, etc.) where the
        // server is almost never truly offline — /health responds in < 200ms so a 2xx ping
        // fires and triggers a silent safeReload() before the grace period expires.
        // With this flag the modal ONLY appears for genuine outages, never for deploys.
        // Default false keeps the existing time-based behaviour for backward compatibility.
        requireFailedPingBeforeModal: false,

        // Text labels — override for localisation or branding
        title: 'Connection lost',
        subtitle: 'The connection was interrupted. Attempting to reconnect\u2026',
        statusText: 'Reconnecting\u2026',
        reloadButtonText: 'Reload now',
        failedTitle: 'Waiting for server\u2026',
        failedSubtitle: 'The connection was lost. Checking server availability\u2026',
        failedReloadButtonText: 'Reload page',
        serverBackTitle: 'Server is available!',
        serverBackManualSubtitle: 'The server is back online.',
        serverBackManualButtonText: 'Reload now',

        // Styling
        customCss: null,       // Inline CSS string injected into the modal
        customCssUrl: null,    // URL to an external stylesheet loaded when the modal opens
                               // e.g. '/_content/MyApp/reconnect.css'

        // Full override (replaces entire modal HTML)
        reconnectingHtml: null,
        failedHtml: null,      // Full override for the "failed" state modal

        // Lifecycle callbacks — fired at key moments. Useful for analytics / telemetry.
        // Each must be a zero-argument function, or null to skip.
        onReconnecting: null,  // () => void — modal is about to show (circuit dropped > grace period)
        onReconnected: null,   // () => void — circuit restored (silently or after modal)
        onFailed: null,        // () => void — Phase 1 exhausted; Phase 2 UI is shown
        onServerBack: null,    // () => void — Phase 2 ping succeeded (server is reachable again)

        // Override with user config
        ...(window.blazorReconnectConfig || {})
    };

    console.log('[BlazorReconnect] Initializing with config:', config);

    const VERSION = 'v1.10.0';

    // ===== SCROLL POSITION PRESERVATION =====
    //
    // Saves window.scrollY to localStorage the instant the circuit drops.
    // Survives window.location.reload() so the user lands back at the same position.
    // Key is deleted immediately after restoration (or on circuit-restore without reload).

    const SCROLL_STORAGE_KEY = '__blazor_reconnect_scroll';

    function saveScrollPosition() {
        try {
            const y = Math.round(window.scrollY);
            localStorage.setItem(SCROLL_STORAGE_KEY, String(y));
            console.log(`[BlazorReconnect] Scroll position saved: ${y}px`);
        } catch (e) {
            // localStorage may be unavailable (private browsing, storage quota, etc.)
        }
    }

    function restoreScrollPosition() {
        try {
            const saved = localStorage.getItem(SCROLL_STORAGE_KEY);
            if (saved === null) return;
            // Disable browser's own scroll restoration so it doesn't race with ours.
            // This is set once here and left as 'manual' for the page lifetime — Blazor
            // Server pages don't benefit from browser scroll restoration anyway.
            if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
            localStorage.removeItem(SCROLL_STORAGE_KEY);
            const y = parseInt(saved, 10);
            if (!isNaN(y) && y > 0) {
                // Use double rAF: first rAF = layout complete, second rAF = paint complete.
                // Ensures scroll height reflects full rendered content before we scroll.
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        window.scrollTo({ top: y, behavior: 'instant' });
                        console.log(`[BlazorReconnect] Scroll position restored: ${y}px`);
                    });
                });
            }
        } catch (e) {
            // localStorage may be unavailable
        }
    }

    function clearScrollPosition() {
        try {
            localStorage.removeItem(SCROLL_STORAGE_KEY);
        } catch (e) {}
    }

    // ===== LIFECYCLE CALLBACKS =====

    function fireCallback(name) {
        const fn = config[name];
        if (typeof fn === 'function') {
            try { fn(); } catch (e) { /* never break the reconnect flow */ }
        }
    }

    // ===== SAFE RELOAD =====
    //
    // Centralises all page reloads. Saves scroll position first (idempotent — overwrites
    // with current value if already saved when the circuit dropped), then reloads.
    // All programmatic reloads go through here so scroll is always preserved.

    function safeReload() {
        saveScrollPosition();
        window.location.reload();
    }

    // ===== STATE =====
    let reconnectModal = null;
    let isInitialLoad = true;
    let retryAttempt = 0;
    let retryCountdownSecs = 0;
    let retryTimer = null;

    // Grace period: timer that delays modal appearance after show() is called.
    // Cancelled (→ no modal) if hide() fires during the grace window.
    let showDelayTimer = null;

    // Set to true by the visibilitychange handler when the user returns to the tab.
    // scheduleShowReconnectModal() reads this to bypass serverPingStartDelayMilliseconds
    // and start Phase 2 at 0ms instead, collapsing discovery time to one network RTT
    // after iPhone screen lock. Auto-resets to false after 5s (or on hide).
    let wokenFromVisibility = false;

    // Phase 2 state
    let serverPingTimer = null;
    let serverPingStartTimer = null;  // delayed start timer
    let serverPingAttempt = 0;
    let serverPingAbortController = null;  // cancels in-flight fetch when circuit reconnects
    let circuitReconnected = false;        // guard: prevents reload if hide() fires just as ping resolves

    // requireFailedPingBeforeModal state
    let pingHasFailed = false;                   // at least one /health ping returned non-2xx or network error
    let graceExpiredAwaitingPingFailure = false;  // grace period elapsed but modal held — waiting for first ping failure

    // ===== UI COMPONENTS =====
    
    function createLogoHtml() {
        if (!config.logoUrl) return '';
        return `<img src="${config.logoUrl}" style="max-height: 56px; max-width: 180px; margin: 0 auto 1rem; display: block; object-fit: contain;" alt="" />`;
    }

    function createSpinnerSvg(color = config.primaryColor) {
        if (config.spinnerUrl) {
            return `<img src="${config.spinnerUrl}" style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" alt="" />`;
        }
        return `
            <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="3"
                        stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/>
            </svg>
        `;
    }

    function getReconnectingHtml() {
        if (config.reconnectingHtml) return config.reconnectingHtml;

        return `
            <div style='position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0, 0, 0, 0.7); z-index: 9999;
                        display: flex; align-items: center; justify-content: center;'>
                <div role='alertdialog' aria-modal='true' aria-labelledby='blazor-reconnect-title' aria-describedby='blazor-reconnect-subtitle'
                     tabindex='-1' style='background: white; padding: 2rem; border-radius: 8px;
                            max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                    ${createLogoHtml()}
                    ${createSpinnerSvg()}
                    <h3 id='blazor-reconnect-title' style='margin: 0 0 0.5rem; color: #333; font-size: 1.25rem;'>${config.title}</h3>
                    <p id='blazor-reconnect-subtitle' style='margin: 0 0 0.25rem; color: #666; font-size: 0.95rem;'>${config.subtitle}</p>
                    <p id='blazor-reconnect-status' style='margin: 0 0 1rem; color: #999; font-size: 0.85rem;'>${config.statusText}</p>
                    <button id='manual-reload-btn'
                            style='background: ${config.primaryColor}; color: white; border: none;
                                   padding: 0.5rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 0.95rem;'>
                        ${config.reloadButtonText}
                    </button>
                    <p style='margin: 1rem 0 0; color: #ccc; font-size: 0.7rem;'>${VERSION}</p>
                </div>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (prefers-reduced-motion: reduce) {
                    #blazor-reconnect-modal svg, #blazor-reconnect-modal img { animation: none !important; }
                }
            </style>
        `;
    }

    function getFailedHtml() {
        if (config.failedHtml) return config.failedHtml;

        // Phase 2 active (default): amber pulsing icon + status line.
        // NOT the red-X dead-end screen — we are still actively working.
        if (config.serverPingEnabled) {
            const pulseIcon = `
                <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; display: block;
                            animation: ping-pulse 1.5s ease-in-out infinite;" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="#F59E0B" stroke-width="2.5"/>
                    <circle cx="12" cy="12" r="4" fill="#F59E0B"/>
                </svg>`;

            return `
                <div style='position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                            background: rgba(0, 0, 0, 0.7); z-index: 9999;
                            display: flex; align-items: center; justify-content: center;'>
                    <div role='alertdialog' aria-modal='true' aria-labelledby='blazor-ping-title' aria-describedby='blazor-ping-subtitle'
                         tabindex='-1' style='background: white; padding: 2rem; border-radius: 8px;
                                max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                        ${createLogoHtml()}
                        ${pulseIcon}
                        <h3 id='blazor-ping-title' style='margin: 0 0 0.5rem; color: #333; font-size: 1.25rem;'>${config.failedTitle}</h3>
                        <p id='blazor-ping-subtitle' style='margin: 0 0 0.25rem; color: #666; font-size: 0.95rem;'>${config.failedSubtitle}</p>
                        <p id='blazor-ping-status' style='margin: 0 0 1.25rem; color: #999; font-size: 0.8rem;'>Checking\u2026</p>
                        <button id='manual-reload-btn'
                                style='background: ${config.primaryColor}; color: white; border: none;
                                       padding: 0.6rem 2rem; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 500;'>
                            ${config.failedReloadButtonText}
                        </button>
                        <p style='margin: 1rem 0 0; color: #ccc; font-size: 0.7rem;'>${VERSION}</p>
                    </div>
                </div>
                <style>
                    @keyframes ping-pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50%       { opacity: 0.5; transform: scale(0.88); }
                    }
                </style>
            `;
        }

        // Phase 2 disabled: legacy static dead-end UI
        const errorIcon = `
            <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; display: block;" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="#e53e3e" stroke-width="2.5"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="#e53e3e" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="#e53e3e" stroke-width="2.5" stroke-linecap="round"/>
            </svg>`;

        return `
            <div style='position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0, 0, 0, 0.7); z-index: 9999;
                        display: flex; align-items: center; justify-content: center;'>
                <div style='background: white; padding: 2rem; border-radius: 8px;
                            max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                    ${createLogoHtml()}
                    ${errorIcon}
                    <h3 style='margin: 0 0 0.5rem; color: #e53e3e; font-size: 1.25rem;'>${config.failedTitle}</h3>
                    <p style='margin: 0 0 1.5rem; color: #666; font-size: 0.95rem;'>${config.failedSubtitle}</p>
                    <button id='manual-reload-btn'
                            style='background: ${config.primaryColor}; color: white; border: none;
                                   padding: 0.6rem 2rem; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 500;'>
                        ${config.failedReloadButtonText}
                    </button>
                </div>
            </div>
        `;
    }

    // ===== PHASE 2: SERVER PING =====

    function updatePingStatus() {
        const el = document.getElementById('blazor-ping-status');
        if (el) el.textContent = `Checking server availability\u2026 (attempt ${serverPingAttempt})`;
    }

    function showServerBackPrompt() {
        // autoReloadOnServerBack = false: update the modal to tell the user the server is back
        const title    = document.getElementById('blazor-ping-title');
        const subtitle = document.getElementById('blazor-ping-subtitle');
        const status   = document.getElementById('blazor-ping-status');
        const btn      = document.getElementById('manual-reload-btn');
        if (title)    title.textContent = config.serverBackTitle;
        if (subtitle) subtitle.textContent = config.serverBackManualSubtitle;
        if (status)   status.textContent = '';
        if (btn)      btn.textContent = config.serverBackManualButtonText;
    }

    function stopServerPing(circuitRestored = false) {
        // Abort any in-flight fetch immediately so it cannot trigger a reload
        // after Blazor has already reconnected the circuit.
        if (serverPingAbortController) {
            serverPingAbortController.abort();
            serverPingAbortController = null;
        }
        if (serverPingStartTimer) {
            clearTimeout(serverPingStartTimer);
            serverPingStartTimer = null;
        }
        if (serverPingTimer) {
            clearInterval(serverPingTimer);
            serverPingTimer = null;
        }
        serverPingAttempt = 0;
        if (circuitRestored) {
            circuitReconnected = true;
            console.log('[BlazorReconnect] Phase 2 aborted — circuit was restored by Blazor');
        }
    }

    function startServerPing(delayMs) {
        if (!config.serverPingEnabled) {
            console.log('[BlazorReconnect] Phase 2 disabled (serverPingEnabled=false)');
            return;
        }
        stopServerPing();
        circuitReconnected = false;
        serverPingAttempt = 0;

        const delay = delayMs ?? 0;

        const begin = () => {
            serverPingStartTimer = null;
            console.log(`[BlazorReconnect] Phase 2 started — polling ${config.serverPingUrl} every ${config.serverPingIntervalMilliseconds}ms indefinitely`);

            serverPingTimer = setInterval(async () => {
                // Belt-and-suspenders: if circuit was restored since last tick, stop
                if (circuitReconnected) { stopServerPing(); return; }

                serverPingAttempt++;
                updatePingStatus();

                // Fresh AbortController per tick so stopServerPing() can cancel it
                serverPingAbortController = new AbortController();
                try {
                    const resp = await fetch(config.serverPingUrl, {
                        cache: 'no-store',
                        signal: serverPingAbortController.signal
                    });
                    serverPingAbortController = null;

                    // Double-check: did Blazor reconnect the circuit while we were waiting?
                    if (circuitReconnected) {
                        console.log('[BlazorReconnect] Phase 2 ping resolved but circuit was already restored — skipping reload');
                        return;
                    }

                    if (resp.ok) {
                        stopServerPing();
                        console.log(`[BlazorReconnect] Phase 2: server responded (${resp.status}) after ${serverPingAttempt} attempt(s)`);
                        if (config.autoReloadOnServerBack) {
                            console.log('[BlazorReconnect] Auto-reloading page');
                            fireCallback('onServerBack');
                            safeReload();
                        } else {
                            console.log('[BlazorReconnect] Showing "server is back" prompt (autoReloadOnServerBack=false)');
                            showServerBackPrompt();
                        }
                    } else {
                        // Non-2xx response (e.g. 503 during deploy) — mark first failure and
                        // show modal immediately if grace already expired and was waiting.
                        if (!pingHasFailed) {
                            pingHasFailed = true;
                            console.log(`[BlazorReconnect] Phase 2: first ping failure (${resp.status})`);
                            if (graceExpiredAwaitingPingFailure && !reconnectModal) {
                                graceExpiredAwaitingPingFailure = false;
                                showReconnectModal(/* pingAlreadyStarted= */ true);
                            }
                        }
                        // Keep polling — server may still be starting up
                    }
                } catch (err) {
                    serverPingAbortController = null;
                    if (err.name === 'AbortError') {
                        // Cancelled by stopServerPing() — circuit reconnected, do nothing
                        return;
                    }
                    // Network-level failure — mark first failure and show modal if waiting.
                    if (!pingHasFailed) {
                        pingHasFailed = true;
                        console.log('[BlazorReconnect] Phase 2: first ping failure (network error)');
                        if (graceExpiredAwaitingPingFailure && !reconnectModal) {
                            graceExpiredAwaitingPingFailure = false;
                            showReconnectModal(/* pingAlreadyStarted= */ true);
                        }
                    }
                    // Server still unreachable — keep polling silently
                }
            }, config.serverPingIntervalMilliseconds);
        };

        if (delay > 0) {
            console.log(`[BlazorReconnect] Phase 2 scheduled to start in ${delay}ms`);
            serverPingStartTimer = setTimeout(begin, delay);
        } else {
            begin();
        }
    }

    // ===== IMMEDIATE PING (triggered by visibility restore) =====
    //
    // Fires a single one-shot health check RIGHT NOW, bypassing the Phase 2 start
    // delay and the current interval position. Used by the visibilitychange handler
    // so discovery time collapses to one network RTT when the user returns to the tab.
    async function fireImmediatePing() {
        if (!config.serverPingEnabled) return;
        if (circuitReconnected) return;

        console.log('[BlazorReconnect] Immediate health check (visibility restore)');

        // Cancel any pending start-delay — Phase 2 is starting right now
        if (serverPingStartTimer) {
            clearTimeout(serverPingStartTimer);
            serverPingStartTimer = null;
        }

        // Abort any in-flight fetch from the regular interval so we don't double-reload
        if (serverPingAbortController) {
            serverPingAbortController.abort();
            serverPingAbortController = null;
        }

        const ctrl = new AbortController();
        serverPingAbortController = ctrl;
        try {
            const resp = await fetch(config.serverPingUrl, {
                cache: 'no-store',
                signal: ctrl.signal
            });
            serverPingAbortController = null;

            if (circuitReconnected) {
                console.log('[BlazorReconnect] Immediate ping resolved but circuit already restored — skipping reload');
                return;
            }

            if (resp.ok) {
                stopServerPing();
                console.log(`[BlazorReconnect] Immediate ping OK (${resp.status}) — server is reachable`);
                if (config.autoReloadOnServerBack) {
                    console.log('[BlazorReconnect] Auto-reloading page');
                    fireCallback('onServerBack');
                    safeReload();
                } else {
                    showServerBackPrompt();
                }
            } else {
                // Server reachable but non-2xx (e.g. degraded health) — mark failure, continue polling.
                if (!pingHasFailed) {
                    pingHasFailed = true;
                    console.log(`[BlazorReconnect] Immediate ping non-OK (${resp.status}) — marking first ping failure`);
                    if (graceExpiredAwaitingPingFailure && !reconnectModal) {
                        graceExpiredAwaitingPingFailure = false;
                        showReconnectModal(/* pingAlreadyStarted= */ true);
                    }
                } else {
                    console.log(`[BlazorReconnect] Immediate ping non-OK (${resp.status}) — continuing polling`);
                }
                // Restart regular interval if it was cleared above
                if (!serverPingTimer) startServerPing(0);
            }
        } catch (err) {
            serverPingAbortController = null;
            if (err.name === 'AbortError') return; // cancelled by stopServerPing() — circuit restored
            // Network-level failure — mark first failure and show modal if waiting.
            if (!pingHasFailed) {
                pingHasFailed = true;
                console.log('[BlazorReconnect] Immediate ping failed (network error) — marking first ping failure');
                if (graceExpiredAwaitingPingFailure && !reconnectModal) {
                    graceExpiredAwaitingPingFailure = false;
                    showReconnectModal(/* pingAlreadyStarted= */ true);
                }
            }
            // Server unreachable — ensure regular polling is running
            console.log('[BlazorReconnect] Immediate ping failed (server unreachable) — continuing polling');
            if (!serverPingTimer) startServerPing(0);
        }
    }

    // ===== RETRY COUNTDOWN =====

    function updateRetryStatus() {
        const el = document.getElementById('blazor-reconnect-status');
        if (!el) return;
        const countdown = retryCountdownSecs > 0 ? `Retrying in ${retryCountdownSecs}s\u2026` : 'Retrying\u2026';
        el.textContent = countdown;
    }

    function getRetryIntervalMs(attempt) {
        const ri = config.retryIntervalMilliseconds;
        if (Array.isArray(ri)) {
            // Blazor backoff array — use last value indefinitely once exhausted
            return ri[Math.min(attempt, ri.length - 1)];
        }
        return typeof ri === 'number' ? ri : 3000;
    }

    function startRetryCountdown() {
        stopRetryCountdown(); // clear any previous timer
        retryAttempt = 1;
        const firstMs = getRetryIntervalMs(retryAttempt);
        // Show 0 for sub-500ms intervals ("Retrying…") rather than incorrectly showing "in 1s"
        retryCountdownSecs = firstMs < 500 ? 0 : Math.round(firstMs / 1000);
        updateRetryStatus();

        retryTimer = setInterval(() => {
            retryCountdownSecs--;
            if (retryCountdownSecs <= 0) {
                retryAttempt++;
                if (retryAttempt > config.maxRetries) {
                    // Our own failsafe: Blazor may not have fired failed() yet
                    // (e.g. if reconnectionOptions patching didn't take effect).
                    stopRetryCountdown();
                    console.log('[BlazorReconnect] Own maxRetries reached — showing failed UI');
                    showFailedModal();
                    return;
                }
                const nextMs = getRetryIntervalMs(retryAttempt);
                retryCountdownSecs = nextMs < 500 ? 0 : Math.round(nextMs / 1000);
            }
            updateRetryStatus();
        }, 1000);
    }

    function stopRetryCountdown() {
        if (retryTimer) {
            clearInterval(retryTimer);
            retryTimer = null;
        }
        retryAttempt = 0;
        retryCountdownSecs = 0;
    }

    // ===== RECONNECT MODAL =====

    function cancelShowDelay() {
        if (showDelayTimer) {
            clearTimeout(showDelayTimer);
            showDelayTimer = null;
        }
    }

    // Called when Blazor fires show() — may be delayed by grace period.
    function scheduleShowReconnectModal() {
        // Save scroll position as the VERY FIRST action when the circuit drops.
        // Only saves on the first call per disconnect (guard below prevents double-saving).
        if (!reconnectModal && !showDelayTimer) {
            saveScrollPosition();
        }

        if (reconnectModal || showDelayTimer) return; // already showing or scheduled

        // Reset ping-failure tracking for this disconnect cycle.
        pingHasFailed = false;
        graceExpiredAwaitingPingFailure = false;

        const delay = config.showDelayMilliseconds || 0;
        if (delay <= 0) {
            showReconnectModal();
            return;
        }

        console.log(`[BlazorReconnect] Circuit dropped — waiting ${delay}ms grace period before showing UI`);
        // Phase 2 ping starts immediately (serverPingStartDelayMilliseconds=0).
        // If wokenFromVisibility=true we always bypass any configured delay and start immediately,
        // collapsing discovery time to one network RTT after screen-wake.
        // A 2xx /health response during the grace period triggers window.location.reload()
        // before the modal is ever shown — completely silent recovery.
        circuitReconnected = false;
        const pingDelay = wokenFromVisibility ? 0 : config.serverPingStartDelayMilliseconds;
        startServerPing(pingDelay);

        showDelayTimer = setTimeout(() => {
            showDelayTimer = null;
            if (!reconnectModal) {
                if (config.requireFailedPingBeforeModal && !pingHasFailed) {
                    // Grace period elapsed but no ping failure confirmed yet.
                    // Hold the modal — the ping interval will call showReconnectModal()
                    // the moment a non-2xx or network error is observed.
                    graceExpiredAwaitingPingFailure = true;
                    console.log('[BlazorReconnect] Grace period elapsed — modal held pending first ping failure (requireFailedPingBeforeModal=true)');
                } else {
                    showReconnectModal(/* pingAlreadyStarted= */ true);
                }
            }
        }, delay);
    }

    function showReconnectModal(pingAlreadyStarted = false) {
        if (reconnectModal) return;

        console.log('[BlazorReconnect] Showing reconnect UI');
        fireCallback('onReconnecting');

        reconnectModal = document.createElement('div');
        reconnectModal.id = 'blazor-reconnect-modal';
        reconnectModal.innerHTML = getReconnectingHtml();

        // Inject inline CSS overrides
        if (config.customCss) {
            const style = document.createElement('style');
            style.textContent = config.customCss;
            reconnectModal.appendChild(style);
        }

        // Load external CSS file (branding stylesheet)
        if (config.customCssUrl && !document.getElementById('blazor-reconnect-css')) {
            const link = document.createElement('link');
            link.id = 'blazor-reconnect-css';
            link.rel = 'stylesheet';
            link.href = config.customCssUrl;
            document.head.appendChild(link);
        }

        document.body.appendChild(reconnectModal);

        // Move focus to the dialog so screen readers announce the connection loss.
        reconnectModal.querySelector('[role=alertdialog]')?.focus();

        document.getElementById('manual-reload-btn')?.addEventListener('click', () => {
            safeReload();
        });

        startRetryCountdown();

        // Phase 2: start server ping after a short delay IN PARALLEL with Phase 1.
        // If we arrived here from scheduleShowReconnectModal(), Phase 2 is already running
        // (pingAlreadyStarted=true). Otherwise start it now.
        if (!pingAlreadyStarted) {
            circuitReconnected = false;
            startServerPing(config.serverPingStartDelayMilliseconds);
        }
    }

    function hideReconnectModal() {
        // Circuit restored without a reload — clear the saved scroll key so it
        // doesn't accidentally restore on the next unrelated page load.
        clearScrollPosition();

        // Circuit restored — clear the visibility flag so the next disconnect
        // (if not visibility-triggered) uses the normal Phase 2 start delay.
        wokenFromVisibility = false;

        // Reset ping-failure tracking — fresh slate for next disconnect cycle.
        pingHasFailed = false;
        graceExpiredAwaitingPingFailure = false;

        // Cancel grace period if hide() fires before the timer expires
        // (circuit reconnected within the silent window — user sees nothing)
        if (showDelayTimer) {
            console.log('[BlazorReconnect] ✅ Circuit restored within grace period — no modal was shown');
            cancelShowDelay();
            stopServerPing(true);
            fireCallback('onReconnected');
            return;
        }
        if (reconnectModal) {
            console.log('[BlazorReconnect] Connection restored, hiding modal');
            stopRetryCountdown();
            // Pass circuitRestored=true: sets circuitReconnected=true AND aborts any in-flight
            // Phase 2 fetch so it cannot trigger a reload after the circuit is back.
            stopServerPing(true);
            reconnectModal.remove();
            reconnectModal = null;
            fireCallback('onReconnected');
        }
    }

    function showFailedModal() {
        const phase2Active = config.serverPingEnabled;
        console.log(`[BlazorReconnect] Phase 1 exhausted — switching to ${phase2Active ? 'Phase 2 (server ping)' : 'static failed'} UI`);
        stopRetryCountdown();
        fireCallback('onFailed');
        // Replace reconnecting modal (if present) with the Phase 2 / failed state
        if (reconnectModal) {
            reconnectModal.remove();
            reconnectModal = null;
        }

        reconnectModal = document.createElement('div');
        reconnectModal.id = 'blazor-reconnect-modal';
        reconnectModal.innerHTML = getFailedHtml();
        document.body.appendChild(reconnectModal);

        // Move focus to the dialog for screen reader accessibility.
        reconnectModal.querySelector('[role=alertdialog]')?.focus();

        document.getElementById('manual-reload-btn')?.addEventListener('click', () => {
            safeReload();
        });

        // If Phase 2 is already running (started in parallel during Phase 1), keep it going.
        // If not yet started (e.g. serverPingStartDelayMs was longer than Phase 1), start it now.
        if (!serverPingTimer && !serverPingStartTimer) {
            startServerPing(0);
        }
    }

    // ===== PRIMARY: Blazor reconnection handler hook =====
    //
    // Blazor exposes Blazor.defaultReconnectionHandler._reconnectionDisplay with three
    // callbacks: show(), hide(), failed(). Replacing this object is the officially
    // documented approach that works in both Blazor Server (.NET 6+) and Blazor Web
    // (.NET 8+) without requiring autostart="false".
    //
    // We attempt to attach this hook as soon as Blazor's JS runtime is ready, then
    // fall back to polling for any edge cases where the hook isn't available.

    let hooked = false;

    function suppressDefaultModal() {
        const el = document.getElementById('components-reconnect-modal');
        if (el) el.style.display = 'none';
    }

    function restoreDefaultModal() {
        const el = document.getElementById('components-reconnect-modal');
        if (el) el.style.display = '';
    }

    function tryHookBlazorHandler() {
        if (!window.Blazor || !Blazor.defaultReconnectionHandler) return false;

        // Check whether our hook is already in place (survives multiple calls)
        if (Blazor.defaultReconnectionHandler._reconnectionDisplay?._isOurHook) return true;

        // Cap the retry window so failed() fires in a reasonable time.
        // Blazor's default is ~100 retries which means 8+ minutes — far too long.
        if (Blazor.defaultReconnectionHandler.reconnectionOptions) {
            Blazor.defaultReconnectionHandler.reconnectionOptions.maxRetries =
                config.maxRetries;
            // Support both flat ms number and backoff array (Blazor accepts both)
            Blazor.defaultReconnectionHandler.reconnectionOptions.retryIntervalMilliseconds =
                Array.isArray(config.retryIntervalMilliseconds)
                    ? Array.prototype.at.bind(config.retryIntervalMilliseconds)
                    : config.retryIntervalMilliseconds;
        }

        Blazor.defaultReconnectionHandler._reconnectionDisplay = {
            _isOurHook: true,
            show() {
                console.log('[BlazorReconnect] ↓ disconnected (Blazor hook)');
                suppressDefaultModal();
                scheduleShowReconnectModal();
            },
            hide() {
                console.log('[BlazorReconnect] ↑ reconnected (Blazor hook)');
                restoreDefaultModal();
                hideReconnectModal();
            },
            failed() {
                // All retries exhausted — show a static "failed" UI.
                // Do NOT auto-reload: that creates an infinite reload loop if the
                // server is still down. The user clicks "Reload page" when ready.
                console.log('[BlazorReconnect] ✗ circuit failed (Blazor hook) — showing failed UI');
                suppressDefaultModal();
                showFailedModal();
            }
        };

        console.log(`[BlazorReconnect] ✅ Blazor.defaultReconnectionHandler hooked (maxRetries=${config.maxRetries}, interval=${config.retryIntervalMilliseconds}ms)`);
        return true;
    }

    // ===== FALLBACK: DOM class polling =====
    //
    // Polls Blazor's #components-reconnect-modal class every 250ms.
    // Used when the Blazor hook is unavailable (older versions, edge cases).
    //
    // "Disconnected" = element exists AND has class components-reconnect-show
    // "Failed"       = element exists AND has class components-reconnect-failed
    // "Connected"    = element absent OR has class components-reconnect-hide

    let lastPollState = 'connected'; // 'connected' | 'disconnected' | 'failed'

    function getCircuitState() {
        const el = document.getElementById('components-reconnect-modal');
        if (!el) return 'connected';
        if (el.classList.contains('components-reconnect-failed')) return 'failed';
        if (el.classList.contains('components-reconnect-show'))   return 'disconnected';
        return 'connected'; // components-reconnect-hide or no class = connected
    }

    function pollReconnectState() {
        if (isInitialLoad) return;

        // Always poll as a safety net — even when the primary hook is active.
        // Blazor may re-initialize defaultReconnectionHandler after a full server restart,
        // replacing our hooked _reconnectionDisplay with its own default object.
        // In that case hide() never fires, so the polling catches the connected state
        // and dismisses the modal automatically.

        const state = getCircuitState();
        if (state === lastPollState) return;

        console.log(`[BlazorReconnect] State (poll): ${lastPollState} → ${state}`);
        lastPollState = state;

        if (state === 'disconnected' && !reconnectModal && !showDelayTimer) {
            suppressDefaultModal();
            scheduleShowReconnectModal();

        } else if (state === 'failed') {
            suppressDefaultModal();
            showFailedModal();
            console.log('[BlazorReconnect] Circuit expired (poll) — showing failed UI');

        } else if (state === 'connected' && reconnectModal) {
            restoreDefaultModal();
            hideReconnectModal();
        }
    }

    function startPolling() {
        setInterval(pollReconnectState, 250);
        console.log('[BlazorReconnect] Fallback polling started (250ms)');
    }

    // ===== MAINTENANCE HOOK =====
    //
    // Re-checks every 5 seconds whether our hook is still in place.
    // After a server restart Blazor may re-initialize defaultReconnectionHandler,
    // replacing _reconnectionDisplay with its own default object and resetting
    // reconnectionOptions to the (very large) defaults. This catches that.
    function startMaintenanceHook() {
        setInterval(() => {
            if (!window.Blazor || !Blazor.defaultReconnectionHandler) return;
            if (!Blazor.defaultReconnectionHandler._reconnectionDisplay?._isOurHook) {
                console.log('[BlazorReconnect] Hook was replaced — re-hooking');
                hooked = tryHookBlazorHandler();
            }
        }, 5000);
    }

    // ===== ERROR SUPPRESSION =====
    
    const originalConsoleError = console.error;
    console.error = function(...args) {
        // args may contain objects — use String() so they don't become '[object Object]'
        const message = Array.from(args).map(a => (typeof a === 'string' ? a : String(a))).join(' ');
        
        // Suppress known benign errors during disconnection
        const suppressPatterns = [
            'Cannot send data if the connection is not in the',
            'MudResizeListener',
            'Invocation canceled due to the underlying connection',
            'Failed to complete negotiation',
            'Failed to fetch',
            'Failed to start the connection',
            'Connection disconnected with error',
            'WebSocket closed with status code: 1006',
            'no reason given'
        ];
        
        if (suppressPatterns.some(p => message.includes(p))) {
            return;
        }
        
        // Detect version deployment - component operations invalid
        // This happens when a new version is deployed while user is connected
        if (message.includes('The list of component operations is not valid')) {
            console.log('[BlazorReconnect] Version deployment detected (invalid component operations), reloading...');
            setTimeout(() => safeReload(), 2000);
            return;
        }
        
        // Detect circuit expiry - trigger reload
        if (message.includes('circuit state could not be retrieved') ||
            (message.includes('circuit') && message.includes('expired'))) {
            console.log('[BlazorReconnect] Circuit expired, reloading...');
            setTimeout(() => safeReload(), 2000);
            return;
        }
        
        originalConsoleError.apply(console, args);
    };

    // ===== CIRCUIT ERROR HANDLER =====
    
    window.addEventListener('unhandledrejection', (event) => {
        if (isInitialLoad) return;

        const error = event.reason?.toString() || '';
        
        // Version deployment - component operations invalid
        if (error.includes('The list of component operations is not valid')) {
            console.log('[BlazorReconnect] Version deployment detected, reloading...');
            event.preventDefault();
            setTimeout(() => safeReload(), 2000);
            return;
        }
        
        // Circuit expired - reload
        if (error.includes('circuit state could not be retrieved') ||
            (error.includes('circuit') && error.includes('expired'))) {
            console.log('[BlazorReconnect] Circuit expired, reloading...');
            event.preventDefault();
            setTimeout(() => safeReload(), 2000);
            return;
        }
        
        // Suppress expected circuit errors
        const suppressPatterns = ['circuit', 'connection being closed', 'Connection disconnected', 'Invocation canceled'];
        if (suppressPatterns.some(p => error.includes(p))) {
            console.log('[BlazorReconnect] Suppressed expected error');
            event.preventDefault();
        }
    });

    // ===== TESTING API =====
    
    window.BlazorReconnect = {
        status: () => {
            const s = {
                version: VERSION,
                modalVisible: !!reconnectModal,
                gracePeriodActive: !!showDelayTimer,
                graceExpiredAwaitingPingFailure,
                pingHasFailed,
                isInitialLoad,
                hooked,
                circuitState: getCircuitState(),
                reconnectModalEl: !!document.getElementById('components-reconnect-modal'),
                serverPingActive: !!serverPingTimer,
                serverPingAttempt,
                wokenFromVisibility,
                scrollPositionSaved: (() => { try { return localStorage.getItem('__blazor_reconnect_scroll') !== null; } catch { return false; } })()
            };
            console.log('[BlazorReconnect] Status:', s);
            return s;
        },
        showModal: () => scheduleShowReconnectModal(),
        showModalNow: () => showReconnectModal(),   // skip grace period for testing
        hideModal: () => hideReconnectModal(),
        showFailedModal: () => showFailedModal(),   // test Phase 2 directly
        stopServerPing: () => stopServerPing(),
        immediatePing: () => fireImmediatePing()    // simulate visibility-restore ping
    };

    console.log('[BlazorReconnect] Testing API: BlazorReconnect.status(), .showModal(), .hideModal(), .showFailedModal(), .stopServerPing(), .immediatePing()');

    // ===== VISIBILITY / FOCUS EVENTS =====
    //
    // On iOS Safari, JavaScript is frozen when the user switches apps or locks the screen.
    // The WebSocket (SignalR) is silently dropped. When the user returns to the browser tab,
    // JS resumes — but the reconnect modal is already visible and Phase 2 may be waiting
    // for its start-delay or the next poll interval (up to 8 seconds total with defaults).
    //
    // These handlers fire the moment the tab becomes visible again, collapsing discovery
    // time to a single network RTT (~100–300ms). If the server is up, the page reloads
    // immediately. If not, normal polling continues.
    //
    // visibilitychange  — reliable on iOS Safari 14.5+, Android Chrome, all modern desktop
    // pageshow (persisted) — iOS bfcache: page restored from cache, circuit is dead → reload

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        if (isInitialLoad) return;
        if (circuitReconnected) return;

        // Mark that we woke from a visibility change. scheduleShowReconnectModal() uses
        // this to start Phase 2 (server ping) immediately (0ms) rather than waiting
        // serverPingStartDelayMilliseconds, which would add 3s to the recovery time.
        // Auto-resets after 5s in case show() never fires (circuit stayed healthy).
        wokenFromVisibility = true;
        setTimeout(() => { wokenFromVisibility = false; }, 5000);

        // 1. ALWAYS attempt Blazor circuit reconnect on visibility restore.
        //    This is safe to call even when the circuit is healthy — it's a no-op in that case.
        //    Previously this was gated on disconnectDetected, so it was skipped entirely when
        //    the screen woke up before Blazor had a chance to detect the dead circuit.
        if (window.Blazor?.reconnect) {
            console.log('[BlazorReconnect] Visibility restore — calling Blazor.reconnect()');
            Blazor.reconnect().then(result => {
                if (result) {
                    console.log('[BlazorReconnect] Blazor.reconnect() succeeded on visibility restore');
                    // hideReconnectModal() will be called by Blazor's hide() callback
                } else {
                    console.log('[BlazorReconnect] Blazor.reconnect() returned false (circuit expired) — awaiting reload via ping');
                }
            }).catch(() => {
                // Not connected yet — ping will handle reload
            });
        }

        // 2. If a disconnect is ALREADY visible (modal or grace period active), fire an
        //    immediate health ping to reload as fast as possible.
        //    If the disconnect is NOT yet detected (common case on cold wake — Blazor hasn't
        //    noticed the dead socket yet), scheduleShowReconnectModal() will start Phase 2
        //    immediately when Blazor fires show(), thanks to wokenFromVisibility=true above.
        const disconnectDetected = !!reconnectModal || !!showDelayTimer;
        if (disconnectDetected) {
            console.log('[BlazorReconnect] Visibility restore with active disconnect — immediate health check');
            fireImmediatePing();
        } else {
            console.log('[BlazorReconnect] Visibility restore — Blazor.reconnect() fired; Phase 2 will start immediately if disconnect is detected');
        }
    });

    // iOS bfcache: when the user navigates back/forward and the page is restored from
    // the browser's cache, all Blazor state is dead-on-arrival. Force a fresh load.
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return; // normal load — nothing to do
        console.log('[BlazorReconnect] Page restored from bfcache (persisted=true) — reloading for fresh circuit');
        window.location.reload();
    });

    // Network restore: fires the instant the browser detects network connectivity.
    // Collapses detection latency to one RTT — no need to wait for the next 2s ping interval.
    // Works on Android Chrome, Desktop Chrome/Firefox/Edge. iOS Safari support is partial
    // but the visibilitychange handler already covers the iOS case.
    window.addEventListener('online', () => {
        if (isInitialLoad) return;
        const disconnectDetected = !!reconnectModal || !!showDelayTimer;
        if (!disconnectDetected) return; // circuit is healthy, nothing to do
        console.log('[BlazorReconnect] Network restored (online event) — immediate health check');
        fireImmediatePing();
    });

    // ===== PAGE LIFECYCLE API (Chrome 68+, Android Chrome) =====
    //
    // 'freeze' fires when the browser is about to freeze the page to save memory
    // (e.g. background tab on Android Chrome). Save scroll NOW so it survives
    // the freeze → resume → reload cycle.
    //
    // 'resume' fires when the browser UNFREEZE a frozen page — BEFORE visibilitychange.
    // Acting here gives the fastest possible reconnect on Android Chrome background-tab
    // scenarios (one RTT sooner than waiting for visibilitychange).

    document.addEventListener('freeze', () => {
        saveScrollPosition();
        console.log('[BlazorReconnect] Page freezing (Page Lifecycle API) — scroll position saved');
    });

    document.addEventListener('resume', () => {
        if (isInitialLoad) return;
        console.log('[BlazorReconnect] Page resumed from frozen state (Page Lifecycle API)');
        // Mark wokenFromVisibility so Phase 2 starts at 0ms when show() fires
        wokenFromVisibility = true;
        setTimeout(() => { wokenFromVisibility = false; }, 5000);
        if (window.Blazor?.reconnect) {
            Blazor.reconnect().catch(() => {});
        }
    });

    // ===== DESKTOP: WINDOW FOCUS EVENT =====
    //
    // visibilitychange fires when the USER SWITCHES TABS. But when the browser WINDOW
    // itself is minimised or alt-tabbed away while the tab is already selected,
    // visibilitychange does NOT fire — only window.focus fires when the window comes back.
    // This covers that gap for desktop users who alt-tab away from the browser entirely.

    window.addEventListener('focus', () => {
        if (isInitialLoad) return;
        if (circuitReconnected) return;
        // Only act when the tab is visible — tab-switch case is handled by visibilitychange.
        if (document.visibilityState !== 'visible') return;

        // Call Blazor.reconnect() unconditionally — safe no-op when circuit is healthy.
        if (window.Blazor?.reconnect) {
            console.log('[BlazorReconnect] Window focused (desktop) — calling Blazor.reconnect()');
            Blazor.reconnect().catch(() => {});
        }
        // If a disconnect is already detected, accelerate recovery with an immediate ping.
        const disconnectDetected = !!reconnectModal || !!showDelayTimer;
        if (disconnectDetected) {
            console.log('[BlazorReconnect] Window focused with active disconnect — immediate health check');
            fireImmediatePing();
        }
    });

    // ===== INITIALIZATION =====

    function init() {
        // Restore scroll position if this is a reconnect-triggered reload.
        // restoreScrollPosition() uses double rAF internally to wait for full layout.
        restoreScrollPosition();

        console.log('[BlazorReconnect] ✅ Initialized');

        // Attempt to hook Blazor.defaultReconnectionHandler as primary mechanism.
        // Poll every 100ms for up to 5 seconds until Blazor's JS runtime is ready.
        let attempts = 0;
        const hookInterval = setInterval(() => {
            attempts++;
            if (tryHookBlazorHandler()) {
                hooked = true;
                clearInterval(hookInterval);
            } else if (attempts >= 50) { // 5 seconds
                clearInterval(hookInterval);
                console.log('[BlazorReconnect] Hook unavailable after 5s — relying on polling fallback');
            }
        }, 100);

        // Maintenance: re-hook every 5s in case Blazor re-inits after server restart.
        startMaintenanceHook();

        // Start polling safety net. The 1-second guard lets Blazor complete its
        // initial circuit connection before we start watching for state changes.
        setTimeout(() => {
            isInitialLoad = false;
            startPolling();
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
