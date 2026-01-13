/**
 * Blazor Version Monitor
 * TheNerdCollective.Blazor.VersionMonitor v1.0.0
 * 
 * Lightweight version monitor that:
 * - Polls a status endpoint for version/commit changes
 * - Shows a non-intrusive banner when a new version is available
 * - Supports deployment phase awareness
 * - Network-aware (re-polls when back online)
 * 
 * Usage:
 *   <script src="_content/TheNerdCollective.Blazor.VersionMonitor/js/blazor-version-monitor.js"></script>
 */

(() => {
    'use strict';
    
    // ===== CONFIGURATION =====
    const config = {
        // Status endpoint
        statusUrl: '/reconnection-status.json',
        enabled: true,
        
        // Polling intervals
        pollInterval: 60000,         // Normal polling (60 seconds)
        fastPollInterval: 5000,      // During deployment (5 seconds)
        
        // UI customization
        primaryColor: '#594AE2',
        versionUpdateMessage: null,
        bannerHtml: null,
        
        // Override with user config
        ...(window.blazorVersionMonitorConfig || {})
    };

    console.log('[VersionMonitor] Initializing with config:', config);

    // ===== STATE =====
    let initialCommit = null;
    let initialVersion = null;
    let currentPollInterval = config.pollInterval;
    let pollTimeout = null;
    let versionBanner = null;
    let lastKnownStatus = null;
    let isDeploymentMode = false;

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
        if (!config.enabled) return null;
        
        // Try local dev file first when running locally
        if (isLocalhost()) {
            try {
                const devUrl = '/reconnection-status.dev.json?t=' + Date.now();
                const devResponse = await fetch(devUrl, { cache: 'no-cache' });
                if (devResponse.ok) {
                    const status = await devResponse.json();
                    console.log('[VersionMonitor] ✅ Local dev status:', status);
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
            console.log('[VersionMonitor] Could not fetch status:', e.message);
        }
        
        return null;
    }

    function isDeploying(status) {
        if (!status) return false;
        const deploymentPhases = ['preparing', 'deploying', 'verifying', 'switching', 'maintenance'];
        return deploymentPhases.includes(status.status) || !!status.deploymentMessage;
    }

    // ===== VERSION BANNER =====
    
    function showVersionBanner(newVersion) {
        if (versionBanner) return;
        
        const message = config.versionUpdateMessage || 
                       'En ny version er tilgængelig - opdater siden når det passer dig';
        
        console.log(`[VersionMonitor] 🆕 New version: ${initialVersion || 'unknown'} → ${newVersion}`);
        
        versionBanner = document.createElement('div');
        versionBanner.id = 'blazor-version-banner';
        
        if (config.bannerHtml) {
            versionBanner.innerHTML = config.bannerHtml;
        } else {
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
        }
        
        document.body.appendChild(versionBanner);
        
        document.getElementById('version-reload-btn')?.addEventListener('click', () => window.location.reload());
        document.getElementById('version-dismiss-btn')?.addEventListener('click', () => hideVersionBanner());
    }

    function hideVersionBanner() {
        if (versionBanner) {
            versionBanner.remove();
            versionBanner = null;
        }
    }

    // ===== STATUS POLLING =====
    
    async function pollStatus() {
        const status = await fetchStatus();
        
        if (status) {
            // Store initial identifiers on first fetch
            if (!initialCommit && status.commit) {
                initialCommit = status.commit;
                console.log('[VersionMonitor] Initial commit:', initialCommit.substring(0, 7));
            }
            if (!initialVersion && status.version) {
                initialVersion = status.version;
                console.log('[VersionMonitor] Initial version:', initialVersion);
            }
            
            // Adjust polling based on deployment status
            const deploying = isDeploying(status);
            if (deploying !== isDeploymentMode) {
                isDeploymentMode = deploying;
                currentPollInterval = deploying ? config.fastPollInterval : config.pollInterval;
                console.log(`[VersionMonitor] ${deploying ? '🚀 Deployment detected' : '✅ Normal mode'}, polling every ${currentPollInterval / 1000}s`);
            }
            
            // Check for version change (only after deployment completes)
            if (!deploying) {
                const commitChanged = status.commit && initialCommit && status.commit !== initialCommit;
                if (commitChanged && !versionBanner) {
                    const displayVersion = status.version || status.commit.substring(0, 7);
                    showVersionBanner(displayVersion);
                }
            }
        }
        
        scheduleNextPoll();
    }

    function scheduleNextPoll() {
        if (pollTimeout) {
            clearTimeout(pollTimeout);
        }
        pollTimeout = setTimeout(pollStatus, currentPollInterval);
    }

    function startPolling() {
        if (!config.enabled) {
            console.log('[VersionMonitor] Disabled via config');
            return;
        }
        
        console.log('[VersionMonitor] Starting polling (every', config.pollInterval / 1000, 's)');
        pollStatus();
    }

    function stopPolling() {
        if (pollTimeout) {
            clearTimeout(pollTimeout);
            pollTimeout = null;
        }
    }

    // ===== NETWORK AWARENESS =====
    
    window.addEventListener('offline', () => {
        console.log('[VersionMonitor] 📡 Browser went offline');
    });

    window.addEventListener('online', () => {
        console.log('[VersionMonitor] 📡 Browser back online, checking status...');
        pollStatus();
    });

    // ===== TESTING API =====
    
    window.BlazorVersionMonitor = {
        status: () => {
            console.log('[VersionMonitor] Status:', {
                initialVersion,
                initialCommit: initialCommit?.substring(0, 7),
                lastKnownStatus,
                isDeploymentMode,
                pollingInterval: currentPollInterval / 1000 + 's',
                bannerVisible: !!versionBanner
            });
            return lastKnownStatus;
        },
        refreshStatus: async () => {
            console.log('[VersionMonitor] 🔄 Refreshing status...');
            await pollStatus();
        },
        showBanner: (version) => {
            showVersionBanner(version || 'test-version');
        },
        hideBanner: hideVersionBanner
    };

    console.log('[VersionMonitor] Testing API: BlazorVersionMonitor.status(), .refreshStatus(), .showBanner(), .hideBanner()');

    // ===== INITIALIZATION =====
    
    function init() {
        console.log('[VersionMonitor] ✅ Initialized');
        
        // Wait a moment then start polling
        setTimeout(() => {
            startPolling();
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
