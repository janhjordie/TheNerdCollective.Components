/**
 * Blazor Server Reconnection Handler
 * TheNerdCollective.Blazor.Reconnect v1.1.0
 *
 * Minimal, non-invasive circuit handler that:
 * - Shows a custom reconnect modal when the Blazor circuit is lost
 * - Polls Blazor's reconnect state every 250ms (reliable, no MutationObserver races)
 * - Auto-reloads on permanent circuit expiry (components-reconnect-failed)
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

        // Text labels — override for localisation or branding
        title: 'Connection lost',
        subtitle: 'The connection was interrupted. Attempting to reconnect\u2026',
        statusText: 'Reconnecting\u2026',
        reloadButtonText: 'Reload now',

        // Styling
        customCss: null,       // Inline CSS string injected into the modal
        customCssUrl: null,    // URL to an external stylesheet loaded when the modal opens
                               // e.g. '/_content/MyApp/reconnect.css'

        // Full override (replaces entire modal HTML)
        reconnectingHtml: null,

        // Override with user config
        ...(window.blazorReconnectConfig || {})
    };

    console.log('[BlazorReconnect] Initializing with config:', config);

    // ===== STATE =====
    let reconnectModal = null;
    let isInitialLoad = true;

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
                    <p style='margin: 0 0 1rem; color: #999; font-size: 0.85rem;'>${config.statusText}</p>
                    <button id='manual-reload-btn'
                            style='background: ${config.primaryColor}; color: white; border: none;
                                   padding: 0.5rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 0.95rem;'>
                        ${config.reloadButtonText}
                    </button>
                </div>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
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
    }

    function hideReconnectModal() {
        if (reconnectModal) {
            console.log('[BlazorReconnect] Connection restored, hiding modal');
            reconnectModal.remove();
            reconnectModal = null;
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

        Blazor.defaultReconnectionHandler._reconnectionDisplay = {
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
                console.log('[BlazorReconnect] ✗ circuit failed (Blazor hook), reloading in 2s');
                suppressDefaultModal();
                showReconnectModal(); // show briefly before reload so user sees something
                setTimeout(() => window.location.reload(), 2000);
            }
        };

        console.log('[BlazorReconnect] ✅ Blazor.defaultReconnectionHandler hooked');
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
            showReconnectModal();
            console.log('[BlazorReconnect] Circuit expired (poll), reloading in 2s');
            setTimeout(() => window.location.reload(), 2000);

        } else if (state === 'connected' && reconnectModal) {
            restoreDefaultModal();
            hideReconnectModal();
        }
    }

    function startPolling() {
        setInterval(pollReconnectState, 250);
        console.log('[BlazorReconnect] Fallback polling started (250ms)');
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
                reconnectModalEl: !!document.getElementById('components-reconnect-modal')
            });
        },
        showModal: () => showReconnectModal(),
        hideModal: () => hideReconnectModal()
    };

    console.log('[BlazorReconnect] Testing API: BlazorReconnect.status(), .showModal(), .hideModal()');

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

        // Start polling fallback in parallel (pollReconnectState is a no-op when hooked=true).
        // The 1-second guard lets Blazor complete its initial circuit connection.
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
