/**
 * Blazor Server Reconnection Handler
 * TheNerdCollective.Blazor.Reconnect v1.0.0
 * 
 * Minimal, non-invasive circuit handler that:
 * - Shows reconnect modal ONLY when Blazor circuit is lost
 * - Uses health check to verify server is responsive
 * - Auto-reloads if server is healthy but circuit is stuck (10s timeout)
 * - Suppresses noisy console errors during disconnection
 * 
 * Works with Blazor's default startup (no autostart=false needed!)
 * 
 * Usage:
 *   <script src="_framework/blazor.web.js"></script>
 *   <script src="_content/TheNerdCollective.Blazor.Reconnect/js/blazor-reconnect.js"></script>
 */

(() => {
    'use strict';
    
    // ===== CONFIGURATION =====
    const config = {
        // UI customization
        primaryColor: '#594AE2',
        successColor: '#4CAF50',
        spinnerUrl: null,
        customCss: null,
        reconnectingHtml: null,
        
        // Override with user config
        ...(window.blazorReconnectConfig || {})
    };

    console.log('[BlazorReconnect] Initializing with config:', config);

    // ===== STATE =====
    let reconnectModal = null;
    let isInitialLoad = true;
    let isModifyingDom = false;
    let reconnectTimeout = null;

    // ===== UI COMPONENTS =====
    
    function createSpinnerSvg(color = config.primaryColor) {
        if (config.spinnerUrl) {
            return `<img src="${config.spinnerUrl}" style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" alt="Loading" />`;
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
                            max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                    ${createSpinnerSvg()}
                    <h3 style='margin: 0 0 0.5rem; color: #333; font-size: 1.25rem;'>Forbindelsen afbrudt</h3>
                    <p style='margin: 0 0 0.25rem; color: #666; font-size: 0.95rem;'>Forbindelsen blev afbrudt. Forsøger at genoprette...</p>
                    <p style='margin: 0 0 1rem; color: #999; font-size: 0.85rem;'>
                        Genopretter forbindelsen...
                    </p>
                    <button id='manual-reload-btn' 
                            style='background: ${config.primaryColor}; color: white; border: none; 
                                   padding: 0.5rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 0.95rem;'>
                        Genindlæs nu
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
        
        if (config.customCss) {
            const style = document.createElement('style');
            style.textContent = config.customCss;
            reconnectModal.appendChild(style);
        }
        
        document.body.appendChild(reconnectModal);
        
        document.getElementById('manual-reload-btn')?.addEventListener('click', () => {
            window.location.reload();
        });
        
        // Start health check - if server is up but we're stuck, force reload
        startReconnectHealthCheck();
    }

    function hideReconnectModal() {
        if (reconnectModal) {
            console.log('[BlazorReconnect] Connection restored, hiding modal');
            reconnectModal.remove();
            reconnectModal = null;
        }
        stopReconnectHealthCheck();
    }
    
    // Health check during reconnect: if server is responding but modal is stuck, force reload
    function startReconnectHealthCheck() {
        if (reconnectTimeout) return;
        
        console.log('[BlazorReconnect] Starting health check (10s timeout)');
        
        reconnectTimeout = setTimeout(async () => {
            if (!reconnectModal) return; // Already hidden, no need to check
            
            console.log('[BlazorReconnect] Checking server health...');
            
            try {
                const response = await fetch('/_blazor/negotiate?negotiateVersion=1', { 
                    method: 'POST',
                    cache: 'no-cache' 
                });
                
                if (response.ok) {
                    console.log('[BlazorReconnect] Server healthy but circuit stuck - forcing reload');
                    window.location.reload();
                } else {
                    console.log('[BlazorReconnect] Server returned', response.status, '- waiting...');
                    reconnectTimeout = null;
                    startReconnectHealthCheck();
                }
            } catch (e) {
                console.log('[BlazorReconnect] Server not reachable:', e.message, '- waiting...');
                reconnectTimeout = null;
                startReconnectHealthCheck();
            }
        }, 10000);
    }
    
    function stopReconnectHealthCheck() {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
    }

    // ===== BLAZOR MODAL OBSERVER =====
    
    function setupReconnectModalObserver() {
        const observer = new MutationObserver(() => {
            if (isModifyingDom) return;
            
            const defaultModal = document.getElementById('components-reconnect-modal');
            
            if (defaultModal && !isInitialLoad && !reconnectModal) {
                // Blazor's default modal appeared - hide it and show ours
                console.log('[BlazorReconnect] Default modal detected, showing custom UI');
                
                isModifyingDom = true;
                try {
                    defaultModal.style.display = 'none';
                    showReconnectModal();
                } finally {
                    isModifyingDom = false;
                }
            } else if (!defaultModal && reconnectModal) {
                // Default modal removed = connection restored
                isModifyingDom = true;
                try {
                    hideReconnectModal();
                } finally {
                    isModifyingDom = false;
                }
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('[BlazorReconnect] Watching for Blazor reconnect modal');
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
                healthCheckActive: !!reconnectTimeout
            });
        },
        showModal: () => showReconnectModal(),
        hideModal: () => hideReconnectModal()
    };

    console.log('[BlazorReconnect] Testing API: BlazorReconnect.status(), .showModal(), .hideModal()');

    // ===== INITIALIZATION =====
    
    function init() {
        console.log('[BlazorReconnect] ✅ Initialized');
        
        setTimeout(() => {
            isInitialLoad = false;
            setupReconnectModalObserver();
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
