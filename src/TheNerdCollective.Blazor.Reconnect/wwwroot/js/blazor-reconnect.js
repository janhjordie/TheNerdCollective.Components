/**
 * Blazor Server Reconnection Handler
 * TheNerdCollective.Blazor.Reconnect v1.5.0
 *
 * Minimal, non-invasive circuit handler that:
 * - Shows a custom reconnect modal when the Blazor circuit is lost
 * - Phase 1: Blazor circuit retry loop (effectively infinite — maxRetries=1000)
 * - Phase 2: server-alive ping starts IN PARALLEL after serverPingStartDelayMs
 *            (default 3s = one retry interval). Uses AbortController to cancel
 *            any in-flight fetch the instant Blazor reconnects the circuit.
 *            circuitReconnected guard prevents reload if hide() fires just
 *            before a ping response lands.
 * - Polls Blazor's reconnect state every 250ms (reliable, no MutationObserver races)
 * - Re-hooks Blazor's reconnectionHandler every 5s so it survives server restarts
 * - Suppresses noisy console errors during disconnection
 * - Works out of the box with sensible defaults — fully customisable
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
        successColor: '#4CAF50',

        // Branding
        logoUrl: null,         // URL to a logo shown above the spinner (e.g. '/_content/MyApp/logo.png')
        spinnerUrl: null,      // URL to a custom spinner image — replaces the SVG spinner

        // Phase 1: circuit retry behaviour (effectively infinite — Phase 2 is the real exit)
        maxRetries: 1000,                 // Effectively infinite: Phase 2 (server ping) triggers reload, not retry exhaustion
        retryIntervalMilliseconds: 3000,  // ms between each Phase 1 retry attempt

        // Phase 2: server-alive polling — starts IN PARALLEL with Phase 1 after a short delay.
        // If the server responds while Phase 1 is still running, reload immediately.
        serverPingEnabled: true,
        serverPingUrl: '/health',                   // Any 2xx response triggers reload
        serverPingStartDelayMilliseconds: 3000,     // Start pinging after 1 failed retry (3s = retryIntervalMilliseconds).
                                                    // This is safe because stopServerPing() uses AbortController to
                                                    // cancel any in-flight fetch if Blazor reconnects the circuit.
        serverPingIntervalMilliseconds: 5000,       // ms between ping attempts
        autoReloadOnServerBack: true,               // true = auto-reload; false = show a prompt

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

        // Override with user config
        ...(window.blazorReconnectConfig || {})
    };

    console.log('[BlazorReconnect] Initializing with config:', config);

    const VERSION = 'v1.5.1';

    // ===== STATE =====
    let reconnectModal = null;
    let isInitialLoad = true;
    let retryAttempt = 0;
    let retryCountdownSecs = 0;
    let retryTimer = null;

    // Phase 2 state
    let serverPingTimer = null;
    let serverPingStartTimer = null;  // delayed start timer
    let serverPingAttempt = 0;
    let serverPingAbortController = null;  // cancels in-flight fetch when circuit reconnects
    let circuitReconnected = false;        // guard: prevents reload if hide() fires just as ping resolves

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
                <div style='background: white; padding: 2rem; border-radius: 8px;
                            max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                    ${createLogoHtml()}
                    ${createSpinnerSvg()}
                    <h3 style='margin: 0 0 0.5rem; color: #333; font-size: 1.25rem;'>${config.title}</h3>
                    <p style='margin: 0 0 0.25rem; color: #666; font-size: 0.95rem;'>${config.subtitle}</p>
                    <p id='blazor-reconnect-status' style='margin: 0 0 1rem; color: #999; font-size: 0.85rem;'>${config.statusText}</p>
                    <button id='manual-reload-btn'
                            style='background: ${config.primaryColor}; color: white; border: none;
                                   padding: 0.5rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 0.95rem;'>
                        ${config.reloadButtonText}
                    </button>
                    <p style='margin: 1rem 0 0; color: #ccc; font-size: 0.7rem;'>${VERSION}</p>
                </div>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
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
                    <div style='background: white; padding: 2rem; border-radius: 8px;
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
        if (el) el.textContent = 'Checking server availability\u2026';
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
                            window.location.reload();
                        } else {
                            console.log('[BlazorReconnect] Showing "server is back" prompt (autoReloadOnServerBack=false)');
                            showServerBackPrompt();
                        }
                    }
                } catch (err) {
                    serverPingAbortController = null;
                    if (err.name === 'AbortError') {
                        // Cancelled by stopServerPing() — circuit reconnected, do nothing
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

    // ===== RETRY COUNTDOWN =====

    function updateRetryStatus() {
        const el = document.getElementById('blazor-reconnect-status');
        if (!el) return;
        const countdown = retryCountdownSecs > 0 ? `Retrying in ${retryCountdownSecs}s\u2026` : 'Retrying\u2026';
        el.textContent = countdown;
    }

    function startRetryCountdown() {
        stopRetryCountdown(); // clear any previous timer
        retryAttempt = 1;
        retryCountdownSecs = Math.max(1, Math.round(config.retryIntervalMilliseconds / 1000));
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
                retryCountdownSecs = Math.max(1, Math.round(config.retryIntervalMilliseconds / 1000));
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

    function showReconnectModal() {
        if (reconnectModal) return;

        console.log('[BlazorReconnect] Showing reconnect UI');

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

        document.getElementById('manual-reload-btn')?.addEventListener('click', () => {
            window.location.reload();
        });

        startRetryCountdown();

        // Phase 2: start server ping after a short delay IN PARALLEL with Phase 1.
        // Reset the circuit-restored guard so a stale true from a previous disconnect cycle
        // cannot suppress the next reload. AbortController ensures any in-flight fetch from
        // the previous cycle is already cancelled before this point.
        circuitReconnected = false;
        startServerPing(config.serverPingStartDelayMilliseconds);
    }

    function hideReconnectModal() {
        if (reconnectModal) {
            console.log('[BlazorReconnect] Connection restored, hiding modal');
            stopRetryCountdown();
            // Pass circuitRestored=true: sets circuitReconnected=true AND aborts any in-flight
            // Phase 2 fetch so it cannot trigger a reload after the circuit is back.
            stopServerPing(true);
            reconnectModal.remove();
            reconnectModal = null;
        }
    }

    function showFailedModal() {
        const phase2Active = config.serverPingEnabled;
        console.log(`[BlazorReconnect] Phase 1 exhausted — switching to ${phase2Active ? 'Phase 2 (server ping)' : 'static failed'} UI`);
        stopRetryCountdown();
        // Replace reconnecting modal (if present) with the Phase 2 / failed state
        if (reconnectModal) {
            reconnectModal.remove();
            reconnectModal = null;
        }

        reconnectModal = document.createElement('div');
        reconnectModal.id = 'blazor-reconnect-modal';
        reconnectModal.innerHTML = getFailedHtml();
        document.body.appendChild(reconnectModal);

        document.getElementById('manual-reload-btn')?.addEventListener('click', () => {
            window.location.reload();
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
            Blazor.defaultReconnectionHandler.reconnectionOptions.retryIntervalMilliseconds =
                config.retryIntervalMilliseconds;
        }

        Blazor.defaultReconnectionHandler._reconnectionDisplay = {
            _isOurHook: true,
            show() {
                console.log('[BlazorReconnect] ↓ disconnected (Blazor hook)');
                suppressDefaultModal();
                showReconnectModal();
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

        if (state === 'disconnected' && !reconnectModal) {
            suppressDefaultModal();
            showReconnectModal();

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
        const message = args.join(' ');
        
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
            setTimeout(() => window.location.reload(), 2000);
            return;
        }
        
        // Detect circuit expiry - trigger reload
        if (message.includes('circuit state could not be retrieved') ||
            (message.includes('circuit') && message.includes('expired'))) {
            console.log('[BlazorReconnect] Circuit expired, reloading...');
            setTimeout(() => window.location.reload(), 2000);
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
            setTimeout(() => window.location.reload(), 2000);
            return;
        }
        
        // Circuit expired - reload
        if (error.includes('circuit state could not be retrieved') ||
            (error.includes('circuit') && error.includes('expired'))) {
            console.log('[BlazorReconnect] Circuit expired, reloading...');
            event.preventDefault();
            setTimeout(() => window.location.reload(), 2000);
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
            console.log('[BlazorReconnect] Status:', {
                modalVisible: !!reconnectModal,
                isInitialLoad,
                hooked,
                circuitState: getCircuitState(),
                reconnectModalEl: !!document.getElementById('components-reconnect-modal'),
                serverPingActive: !!serverPingTimer,
                serverPingAttempt
            });
        },
        showModal: () => showReconnectModal(),
        hideModal: () => hideReconnectModal(),
        showFailedModal: () => showFailedModal(),   // test Phase 2 directly
        stopServerPing: () => stopServerPing()
    };

    console.log('[BlazorReconnect] Testing API: BlazorReconnect.status(), .showModal(), .hideModal(), .showFailedModal(), .stopServerPing()');

    // ===== INITIALIZATION =====

    function init() {
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
