/**
 * Blazor Server Reconnection Handler
 * 
 * Minimal, non-invasive circuit handler that:
 * - Shows reconnect modal ONLY when Blazor circuit is lost (user loses connection)
 * - Uses health check to verify server is responsive when reconnecting
 * - Does NOT show deployment overlays (rely on status endpoint UI in app)
 * - Silently polls status for version change detection
 * 
 * Works with MudBlazor 8.15+ and .NET 10
 * 
 * Setup: Just load this script after blazor.web.js (no autostart=false needed!)
 */

(() => {
    'use strict';
    
    // ===== CONFIGURATION =====
    const config = {
        // Status endpoint
        statusUrl: '/reconnection-status.json',
        checkStatus: true,
        
        // Polling intervals
        statusPollInterval: 5000,        // Fast polling during deployment (5 seconds)
        normalPollInterval: 60000,       // Slow polling during normal operation (60 seconds)
        
        // UI customization
        primaryColor: '#594AE2',
        successColor: '#4CAF50',
        spinnerUrl: null,
        customCss: null,
        reconnectingHtml: null,
        serverRestartHtml: null,
        deploymentHtml: null,
        versionUpdateMessage: null,
        
        // Override with user config
        ...(window.blazorReconnectionConfig || {})
    };

    console.log('[CircuitHandler] Status overlay initializing with config:', config);

    // ===== STATE =====
    let initialCommit = null;      // Commit SHA when page loaded (primary identifier)
    let initialVersion = null;     // Human-readable version when page loaded
    let currentPollInterval = config.normalPollInterval;
    let versionPollTimeout = null;
    let versionBanner = null;
    let reconnectModal = null;
    let lastKnownStatus = null;
    let isInitialLoad = true;
    let isModifyingDom = false;    // Prevent MutationObserver re-entrancy
    let healthCheckInterval = null; // Health monitor interval

    // ===== UTILITY FUNCTIONS =====
    
    function isLocalhost() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || 
               hostname === '127.0.0.1' || 
               hostname === '[::1]' || 
               hostname.match(/^192\.168\.\d{1,3}\.\d{1,3}$/) ||
               hostname.match(/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    }

    async function fetchStatus() {
        if (!config.checkStatus) return null;
        
        // Try local dev file first when running locally
        if (isLocalhost()) {
            try {
                const devUrl = '/reconnection-status.dev.json?t=' + Date.now();
                const devResponse = await fetch(devUrl, { cache: 'no-cache' });
                if (devResponse.ok) {
                    const status = await devResponse.json();
                    console.log('[CircuitHandler] ✅ Local dev status loaded:', status);
                    lastKnownStatus = status;
                    return status;
                }
            } catch (e) {
                // Fall through to production URL
            }
        }
        
        try {
            const response = await fetch(config.statusUrl + '?t=' + Date.now(), { cache: 'no-cache' });
            if (response.ok) {
                const status = await response.json();
                lastKnownStatus = status;
                return status;
            }
        } catch (e) {
            console.log('[CircuitHandler] Could not fetch status:', e.message);
        }
        
        return null;
    }

    // Check if status indicates deployment in progress
    function isDeploying(status) {
        if (!status) return false;
        const deploymentPhases = ['preparing', 'deploying', 'verifying', 'switching', 'maintenance'];
        return deploymentPhases.includes(status.status) || !!status.deploymentMessage;
    }
    
    function getPhaseLabel(status) {
        if (!status) return '';
        switch (status.status) {
            case 'preparing': return '🔧 Forbereder';
            case 'deploying': return '🚀 Deployer';
            case 'verifying': return '🔍 Verificerer';
            case 'switching': return '🔄 Skifter';
            case 'maintenance': return '🛠️ Vedligeholdelse';
            default: return '';
        }
    }

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

    function getDeploymentHtml(status) {
        if (config.deploymentHtml) return config.deploymentHtml;
        
        const phaseLabel = getPhaseLabel(status);
        const message = status?.deploymentMessage || 'Vi opdaterer systemet. Vent venligst...';
        const features = status?.features || [];
        const estimatedMinutes = status?.estimatedDurationMinutes || status?.estimatedMinutes;
        const version = status?.version;
        
        let featuresHtml = '';
        if (features.length > 0) {
            featuresHtml = `
                <ul style='margin: 1rem 0; padding-left: 1.5rem; text-align: left; color: #555;'>
                    ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
            `;
        }

        let estimateHtml = estimatedMinutes ? `
            <p style='margin: 0.5rem 0 0; color: #999; font-size: 0.9rem;'>
                Forventet tid: ${estimatedMinutes} minut${estimatedMinutes !== 1 ? 'ter' : ''}
            </p>
        ` : '';

        let versionHtml = version ? `
            <p style='margin: 0.5rem 0 0; color: #bbb; font-size: 0.8rem;'>Version: ${version}</p>
        ` : '';

        return `
            <div style='position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                        background: rgba(0, 0, 0, 0.85); z-index: 9999; 
                        display: flex; align-items: center; justify-content: center;'>
                <div style='background: white; padding: 3rem; border-radius: 12px; 
                            max-width: 500px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);'>
                    ${createSpinnerSvg()}
                    <h3 style='margin: 0 0 1rem; color: #333; font-size: 1.5rem; font-weight: 500;'>
                        ${phaseLabel || '🚀 Deploying Updates'}
                    </h3>
                    <p style='margin: 0 0 0.5rem; color: #666; font-size: 1rem;'>${message}</p>
                    ${featuresHtml}
                    ${estimateHtml}
                    ${versionHtml}
                    <p style='margin: 1.5rem 0 0; color: #999; font-size: 0.85rem;'>
                        Siden opdateres automatisk når vi er klar.
                    </p>
                </div>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
    }

    function getReconnectingHtml(status) {
        if (config.reconnectingHtml) return config.reconnectingHtml;
        
        const message = status?.reconnectingMessage || 'Forbindelsen blev afbrudt. Forsøger at genoprette...';
        
        return `
            <div style='position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                        background: rgba(0, 0, 0, 0.7); z-index: 9999; 
                        display: flex; align-items: center; justify-content: center;'>
                <div style='background: white; padding: 2rem; border-radius: 8px; 
                            max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                    ${createSpinnerSvg()}
                    <h3 style='margin: 0 0 0.5rem; color: #333; font-size: 1.25rem;'>Forbindelsen afbrudt</h3>
                    <p style='margin: 0 0 0.25rem; color: #666; font-size: 0.95rem;'>${message}</p>
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

    // ===== VERSION BANNER =====
    
    function showVersionBanner(newVersion) {
        if (versionBanner) return;
        
        const message = config.versionUpdateMessage || 
                       'En ny version er tilgængelig - opdater siden når det passer dig';
        
        console.log(`[CircuitHandler] 🆕 New version: ${initialVersion} → ${newVersion}`);
        
        versionBanner = document.createElement('div');
        versionBanner.id = 'blazor-version-banner';
        versionBanner.innerHTML = `
            <div style='position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                        background: ${config.primaryColor}; color: white; 
                        padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 9998; display: flex; align-items: center; gap: 1rem; max-width: 90%;'>
                <span style='flex: 1; font-size: 0.95rem;'>${message}</span>
                <button id='version-reload-btn' 
                        style='background: white; color: ${config.primaryColor}; border: none; 
                               padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; 
                               font-weight: 600; font-size: 0.9rem; white-space: nowrap;'>
                    Opdater nu
                </button>
                <button id='version-dismiss-btn' 
                        style='background: transparent; color: white; border: 1px solid white; 
                               padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; 
                               font-size: 0.9rem; white-space: nowrap;'>
                    Senere
                </button>
            </div>
        `;
        
        document.body.appendChild(versionBanner);
        
        document.getElementById('version-reload-btn').onclick = () => window.location.reload();
        document.getElementById('version-dismiss-btn').onclick = () => hideVersionBanner();
    }

    function hideVersionBanner() {
        if (versionBanner) {
            versionBanner.remove();
            versionBanner = null;
        }
    }

    // ===== DEPLOYMENT OVERLAY (DISABLED) =====
    // Deployment feedback is handled by app's status banner
    // We do not show overlays during deployment, only on actual circuit loss
    
    function hideDeploymentOverlay() {
        // No-op: deployment overlays are not shown
    }

    // ===== RECONNECT MODAL (enhances Blazor's default) =====
    
    function showReconnectModal(status) {
        if (reconnectModal) return;
        
        console.log('[CircuitHandler] Showing reconnect UI');
        
        reconnectModal = document.createElement('div');
        reconnectModal.id = 'blazor-reconnect-modal';
        reconnectModal.innerHTML = getReconnectingHtml(status);
        
        if (config.customCss) {
            const style = document.createElement('style');
            style.textContent = config.customCss;
            reconnectModal.appendChild(style);
        }
        
        document.body.appendChild(reconnectModal);
        
        document.getElementById('manual-reload-btn')?.addEventListener('click', () => {
            window.location.reload();
        });
    }

    function hideReconnectModal() {
        if (reconnectModal) {
            reconnectModal.remove();
            reconnectModal = null;
        }
    }

    // ===== STATUS POLLING =====
    // Silently polls for version changes; does not show deployment overlays
    
    async function pollStatus() {
        const status = await fetchStatus();
        
        if (status) {
            // Store initial identifiers on first fetch
            if (!initialCommit && status.commit) {
                initialCommit = status.commit;
                console.log('[CircuitHandler] Initial commit:', initialCommit.substring(0, 7));
            }
            if (!initialVersion && status.version) {
                initialVersion = status.version;
                console.log('[CircuitHandler] Initial version:', initialVersion);
            }
            
            // Only check for version change; deployment overlay is disabled
            if (!isDeploying(status)) {
                // Check for version change (only after deployment completes)
                const commitChanged = status.commit && initialCommit && status.commit !== initialCommit;
                if (commitChanged && !versionBanner) {
                    const displayVersion = status.version || status.commit.substring(0, 7);
                    showVersionBanner(displayVersion);
                }
            }
        }
        
        // Schedule next poll
        scheduleNextPoll();
    }

    function scheduleNextPoll() {
        if (versionPollTimeout) {
            clearTimeout(versionPollTimeout);
        }
        versionPollTimeout = setTimeout(pollStatus, currentPollInterval);
    }

    function startPolling() {
        if (!config.checkStatus) return;
        
        console.log('[CircuitHandler] Starting status polling (every', config.normalPollInterval / 1000, 's)');
        
        // Initial poll
        pollStatus();
    }

    function stopPolling() {
        if (versionPollTimeout) {
            clearTimeout(versionPollTimeout);
            versionPollTimeout = null;
        }
    }

    // ===== BLAZOR RECONNECT MODAL OBSERVER =====
    // Watch for Blazor's default reconnect modal and enhance it
    
    function setupReconnectModalObserver() {
        const observer = new MutationObserver(async () => {
            // Skip if we're currently modifying DOM ourselves
            if (isModifyingDom) return;
            
            const defaultModal = document.getElementById('components-reconnect-modal');
            
            if (defaultModal && !isInitialLoad && !reconnectModal && !deploymentOverlay) {
                // Blazor's default modal appeared - hide it and show ours
                console.log('[CircuitHandler] Default reconnect modal detected');
                
                isModifyingDom = true;
                try {
                    defaultModal.style.display = 'none';
                    
                    const status = await fetchStatus();
                    
                    if (isDeploying(status)) {
                        showDeploymentOverlay(status);
                    } else {
                        showReconnectModal(status);
                    }
                } finally {
                    isModifyingDom = false;
                }
            } else if (!defaultModal && reconnectModal) {
                // Default modal removed = connection restored
                // Health check has confirmed server is up, safe to hide
                console.log('[CircuitHandler] Connection restored, hiding reconnect modal');
                
                isModifyingDom = true;
                try {
                    hideReconnectModal();
                } finally {
                    isModifyingDom = false;
                }
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('[CircuitHandler] Watching for Blazor reconnect modal');
    }
    
    // ===== HEALTH MONITOR =====
    // Periodic health logging for debugging
    
    function startHealthMonitor() {
        if (healthCheckInterval) return;
        
        let healthCheckCount = 0;
        
        healthCheckInterval = setInterval(() => {
            healthCheckCount++;
            
            let mode = '✅ Normal';
            if (lastKnownStatus?.status) {
                switch (lastKnownStatus.status) {
                    case 'preparing': mode = '🔧 Preparing'; break;
                    case 'deploying': mode = '🚀 Deploying'; break;
                    case 'verifying': mode = '🔍 Verifying'; break;
                    case 'switching': mode = '🔄 Switching'; break;
                    case 'maintenance': mode = '🛠️ Maintenance'; break;
                }
            }
            
            const pollRate = currentPollInterval ? `${currentPollInterval / 1000}s` : 'stopped';
            const version = initialVersion || 'pending';
            
            console.log(`[CircuitHandler] 💓 Health #${healthCheckCount} | Mode: ${mode} | Poll: ${pollRate} | Version: ${version} | Online: ${navigator.onLine}`);
        }, 5000);
        
        console.log('[CircuitHandler] 🩺 Health monitor started (5s interval)');
    }
    
    function stopHealthMonitor() {
        if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
        }
    }

    // ===== ERROR SUPPRESSION =====
    // Suppress noisy console errors during reconnection
    
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
            return; // Suppress
        }
        
        // Detect circuit expiry - trigger reload
        if (message.includes('circuit state could not be retrieved') ||
            (message.includes('circuit') && message.includes('expired'))) {
            console.log('[CircuitHandler] Circuit expired, reloading in 2 seconds...');
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
            console.log('[CircuitHandler] Circuit expired, reloading...');
            event.preventDefault();
            setTimeout(() => window.location.reload(), 2000);
            return;
        }
        
        // Suppress expected circuit errors
        const suppressPatterns = ['circuit', 'connection being closed', 'Connection disconnected', 'Invocation canceled'];
        if (suppressPatterns.some(p => error.includes(p))) {
            console.log('[CircuitHandler] Suppressed expected circuit error');
            event.preventDefault();
        }
    });

    // ===== NETWORK AWARENESS =====
    
    window.addEventListener('offline', () => {
        console.log('[CircuitHandler] 📡 Browser went offline');
    });

    window.addEventListener('online', () => {
        console.log('[CircuitHandler] 📡 Browser back online, checking status...');
        pollStatus();
    });

    // ===== TESTING API =====
    
    window.BlazorReconnectionTest = {
        status: () => {
            console.log('[CircuitHandler] 📊 Status:', {
                initialVersion,
                initialCommit: initialCommit?.substring(0, 7),
                lastKnownStatus,
                isDeploymentMode,
                pollingInterval: currentPollInterval / 1000 + 's',
                versionBannerVisible: !!versionBanner,
                deploymentOverlayVisible: !!deploymentOverlay,
                reconnectModalVisible: !!reconnectModal
            });
        },
        refreshStatus: async () => {
            console.log('[CircuitHandler] 🔄 Refreshing status...');
            await pollStatus();
        },
        showVersionBanner: (version) => {
            showVersionBanner(version || 'test-version');
        },
        hideVersionBanner,
        showDeployment: async () => {
            const status = await fetchStatus() || { status: 'deploying', deploymentMessage: 'Test deployment' };
            showDeploymentOverlay(status);
        },
        hideDeployment: hideDeploymentOverlay
    };

    console.log('[CircuitHandler] 🧪 Testing API: BlazorReconnectionTest.status(), .refreshStatus(), .showVersionBanner(), .showDeployment()');

    // ===== INITIALIZATION =====
    
    function init() {
        console.log('[CircuitHandler] ✅ Status overlay initialized (non-invasive mode)');
        
        // Wait a moment for Blazor to fully initialize
        setTimeout(() => {
            isInitialLoad = false;
            
            // Start polling for status updates
            startPolling();
            
            // Watch for Blazor's reconnect modal
            setupReconnectModalObserver();
            
            // Start health monitor for debugging
            startHealthMonitor();
            
        }, 1000);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
