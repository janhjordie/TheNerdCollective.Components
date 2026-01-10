/**
 * Blazor Server Reconnection Handler
 * Infinite reconnection with exponential backoff (1s → 3s → 5s max)
 * Only shows UI after 5 failed attempts for better UX during quick reconnects
 * Follows official Microsoft guidance from:
 * https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/signalr
 * Works with MudBlazor 8.15+ and .NET 10
 * 
 * Customization: Call window.configureBlazorReconnection(options) before Blazor.start()
 */

(() => {
    const initialInterval = 1000;  // Start at 1 second
    const maxInterval = 5000;      // Max 5 seconds between attempts
    const showUIAfterAttempts = 5; // Only show UI after 5 silent attempts
    let isInitialLoad = true;
    let reconnectModal = null;
    let currentInterval = initialInterval;
    let isOffline = !navigator.onLine;
    
    // Read configuration from window.blazorReconnectionConfig (set before script loads)
    let config = {
        reconnectingHtml: null,
        serverRestartHtml: null,
        deploymentHtml: null,
        statusUrl: '/reconnection-status.json',
        checkStatus: true,
        statusPollInterval: 5000,
        customCss: null,
        spinnerUrl: null,
        primaryColor: '#594AE2',
        successColor: '#4CAF50',
        ...(window.blazorReconnectionConfig || {})
    };

    console.log('[CircuitHandler] Reconnection handler initializing with config:', config);

    // Status tracking
    let reconnectionStatus = null;
    let statusCheckInterval = null;
    let lastVersion = null;
    let initialVersion = null; // Track version on page load
    let versionBanner = null; // New version available banner
    let versionPollInterval = null; // Background version checking

    // Legacy API - for backward compatibility
    window.configureBlazorReconnection = (options) => {
        config = { ...config, ...options };
        console.log('[CircuitHandler] Reconnection dialog configured with custom options');
    };

    // Detect if running locally
    function isLocalhost() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || 
               hostname === '127.0.0.1' || 
               hostname === '[::1]' || 
               hostname.match(/^192\.168\.\d{1,3}\.\d{1,3}$/) || // Local network
               hostname.match(/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/); // Docker/containers
    }

    // Check reconnection status
    async function checkReconnectionStatus() {
        if (!config.checkStatus) return null;
        
        // Try local dev file first when running locally
        if (isLocalhost()) {
            try {
                const devUrl = '/reconnection-status.dev.json?t=' + Date.now();
                console.log('[CircuitHandler] Trying local dev status file:', devUrl);
                
                const devResponse = await fetch(devUrl, {
                    cache: 'no-cache',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (devResponse.ok) {
                    const status = await devResponse.json();
                    console.log('[CircuitHandler] ✅ Local dev status loaded:', status);
                    return status;
                }
            } catch (e) {
                console.log('[CircuitHandler] No local dev status file, falling back to configured URL');
            }
        }
        
        // Fall back to configured statusUrl (production blob storage or default)
        try {
            const response = await fetch(config.statusUrl + '?t=' + Date.now(), {
                cache: 'no-cache',
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const status = await response.json();
                console.log('[CircuitHandler] Reconnection status loaded:', status);
                return status;
            }
        } catch (e) {
            console.log('[CircuitHandler] Could not load reconnection status, using defaults');
        }
        
        return null;
    }

    // Get message from status
    function getStatusMessage(status, isDeployment = false) {
        if (!status) return null;
        
        if (isDeployment && status.deploymentMessage) {
            return status.deploymentMessage;
        }
        
        return status.reconnectingMessage || null;
    }

    // Check if status indicates deployment
    function isDeploying(status) {
        return status && (status.status === 'deploying' || status.deploymentMessage);
    }

    // Show new version available banner
    function showVersionBanner(newVersion) {
        if (versionBanner) return; // Already showing
        
        const message = config.versionUpdateMessage || 
                       'En ny version er tilgængelig - opdater siden når det passer dig';
        
        console.log(`[CircuitHandler] New version available: ${initialVersion} → ${newVersion}`);
        
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
        
        // Wire up buttons
        document.getElementById('version-reload-btn').onclick = () => {
            console.log('[CircuitHandler] User clicked "Opdater nu", reloading...');
            window.location.reload();
        };
        
        document.getElementById('version-dismiss-btn').onclick = () => {
            console.log('[CircuitHandler] User dismissed version banner');
            hideVersionBanner();
        };
    }

    // Hide version banner
    function hideVersionBanner() {
        if (versionBanner) {
            versionBanner.remove();
            versionBanner = null;
        }
    }

    // Start background version polling
    function startVersionPolling() {
        if (!config.checkStatus) return;
        if (versionPollInterval) return; // Already polling
        
        console.log('[CircuitHandler] Starting version polling every', config.statusPollInterval, 'ms');
        
        versionPollInterval = setInterval(async () => {
            const status = await checkReconnectionStatus();
            if (!status || !status.version) return;
            
            // First time we get a version, store it as initial
            if (!initialVersion) {
                initialVersion = status.version;
                console.log('[CircuitHandler] Initial version:', initialVersion);
                return;
            }
            
            // Check if version changed
            if (status.version !== initialVersion && !versionBanner) {
                showVersionBanner(status.version);
            }
        }, config.statusPollInterval);
    }

    // Stop version polling
    function stopVersionPolling() {
        if (versionPollInterval) {
            clearInterval(versionPollInterval);
            versionPollInterval = null;
        }
    }

    // Connection health monitor
    let connectionMonitorInterval = null;
    let lastConnectionCheck = Date.now();
    
    function startConnectionMonitor() {
        if (connectionMonitorInterval) return;
        
        console.log('[CircuitHandler] 🩺 Starting connection health monitor (5s interval)');
        
        connectionMonitorInterval = setInterval(() => {
            try {
                const blazor = window.Blazor;
                let connectionState = 'Unknown';
                let connectionId = 'N/A';
                
                if (blazor?._internal?.dotNetExports?.INTERNAL?.getConnection) {
                    const connection = blazor._internal.dotNetExports.INTERNAL.getConnection();
                    connectionState = connection.connectionState || connection.state || 'Unknown';
                    connectionId = connection.connectionId || 'N/A';
                }
                
                const uptime = Math.floor((Date.now() - lastConnectionCheck) / 1000);
                lastConnectionCheck = Date.now();
                
                console.log(`[CircuitHandler] 💓 Health Check | State: ${connectionState} | ID: ${connectionId} | Version: ${initialVersion || 'pending'} | Online: ${navigator.onLine}`);
            } catch (err) {
                console.warn('[CircuitHandler] ⚠️ Health check error:', err.message);
            }
        }, 5000);
    }
    
    function stopConnectionMonitor() {
        if (connectionMonitorInterval) {
            clearInterval(connectionMonitorInterval);
            connectionMonitorInterval = null;
            console.log('[CircuitHandler] Connection health monitor stopped');
        }
    }

    // Generate deployment/reconnection HTML with status
    function getStatusHtml(status) {
        const isDeploymentMode = isDeploying(status);
        
        if (isDeploymentMode && config.deploymentHtml) {
            return config.deploymentHtml;
        }
        
        if (!isDeploymentMode && config.reconnectingHtml) {
            return config.reconnectingHtml;
        }

        const message = getStatusMessage(status, isDeploymentMode) || 
                       (isDeploymentMode ? 'We are deploying new features. Please wait...' : 'Reconnecting...');
        const features = status?.features || [];
        const estimatedMinutes = status?.estimatedDurationMinutes || status?.estimatedMinutes;
        const version = status?.version;
        
        let featuresHtml = '';
        if (isDeploymentMode && features.length > 0) {
            featuresHtml = `
                <ul style='margin: 1rem 0; padding-left: 1.5rem; text-align: left; color: #555;'>
                    ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
            `;
        }

        let estimateHtml = '';
        if (isDeploymentMode && estimatedMinutes) {
            estimateHtml = `
                <p style='margin: 0.5rem 0 0; color: #999; font-size: 0.9rem;'>
                    Estimated time: ${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''}
                </p>
            `;
        }

        let versionHtml = '';
        if (version) {
            versionHtml = `
                <p style='margin: 0.5rem 0 0; color: #bbb; font-size: 0.8rem;'>
                    Version: ${version}
                </p>
            `;
        }

        const spinnerSvg = config.spinnerUrl 
            ? `<img src="${config.spinnerUrl}" style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" alt="Loading" />`
            : `<svg style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="${config.primaryColor}" stroke-width="3" 
                        stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/>
               </svg>`;
        
        const title = isDeploymentMode ? '🚀 Deploying Updates' : 'Connection Lost';
        const subtitle = isDeploymentMode 
            ? 'The page will reload automatically when complete.'
            : `Next attempt in <span id='countdown-seconds'>1</span>s`;
        
        return `
            <div style='position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                        background: rgba(0, 0, 0, 0.85); z-index: 9999; 
                        display: flex; align-items: center; justify-content: center;'>
                <div style='background: white; padding: 3rem; border-radius: 12px; 
                            max-width: 500px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);'>
                    ${spinnerSvg}
                    <h3 style='margin: 0 0 1rem; color: #333; font-size: 1.5rem; font-weight: 500;'>
                        ${title}
                    </h3>
                    <p id='reconnect-status' style='margin: 0 0 0.5rem; color: #666; font-size: 1rem;'>
                        ${message}
                    </p>
                    ${featuresHtml}
                    ${estimateHtml}
                    ${versionHtml}
                    <p id='reconnect-countdown' style='margin: 1.5rem 0 ${isDeploymentMode ? '0' : '1rem'}; color: #999; font-size: 0.85rem;'>
                        ${subtitle}
                    </p>
                    ${isDeploymentMode ? '' : `
                        <button id='manual-reload-btn' 
                                style='background: ${config.primaryColor}; color: white; border: none; 
                                       padding: 0.75rem 2rem; border-radius: 6px; 
                                       cursor: pointer; font-size: 1rem; font-weight: 500;
                                       transition: background 0.2s;'>
                            Genindlæs nu
                        </button>
                    `}
                </div>
            </div>
            ${config.customCss ? '' : `<style>@keyframes spin { to { transform: rotate(360deg); } }</style>`}
        `;
    }
    
    // Generate default reconnecting HTML
    function getDefaultReconnectingHtml() {
        const spinnerSvg = config.spinnerUrl 
            ? `<img src="${config.spinnerUrl}" style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" alt="Reconnecting" />`
            : `<svg style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="${config.primaryColor}" stroke-width="3" 
                        stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/>
               </svg>`;
        
        return `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                        background: rgba(0, 0, 0, 0.7); z-index: 9999; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 2rem; border-radius: 8px; 
                            max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    ${spinnerSvg}
                    <h3 style="margin: 0 0 0.5rem; color: #333; font-size: 1.25rem;">Connection Lost</h3>
                    <p id="reconnect-status" style="margin: 0 0 0.25rem; color: #666; font-size: 0.95rem;">
                        Reconnecting...
                    </p>
                    <p id="reconnect-countdown" style="margin: 0 0 1rem; color: #999; font-size: 0.85rem;">
                        Next attempt in <span id="countdown-seconds">1</span>s
                    </p>
                    <button id="manual-reload-btn" style="background: ${config.primaryColor}; color: white; border: none; 
                                                           padding: 0.5rem 1.5rem; border-radius: 4px; 
                                                           cursor: pointer; font-size: 0.95rem;">
                        Reload Now
                    </button>
                </div>
            </div>
            ${config.customCss ? '' : `<style>@keyframes spin { to { transform: rotate(360deg); } }</style>`}
        `;
    }
    
    // Generate default server restart HTML
    function getDefaultServerRestartHtml() {
        const spinnerSvg = config.spinnerUrl 
            ? `<img src="${config.spinnerUrl}" style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" alt="Reconnecting" />`
            : `<svg style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="${config.successColor}" stroke-width="3" 
                        stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/>
               </svg>`;
        
        return `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                        background: rgba(0, 0, 0, 0.7); z-index: 9999; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 2rem; border-radius: 8px; 
                            max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    ${spinnerSvg}
                    <h3 style="margin: 0 0 0.5rem; color: #333; font-size: 1.25rem;">Reconnecting...</h3>
                    <p style="margin: 0 0 1rem; color: #666; font-size: 0.95rem;">
                        Please wait a moment...
                    </p>
                </div>
            </div>
            ${config.customCss ? '' : `<style>@keyframes spin { to { transform: rotate(360deg); } }</style>`}
        `;
    }

    // Show reconnection UI (simplified, no attempt counter)
    async function showReconnectingUI() {
        if (isInitialLoad || reconnectModal) return;

        reconnectModal = document.createElement('div');
        reconnectModal.id = 'blazor-reconnect-modal';
        
        // Try to load status to decide which UI to show
        let status = null;
        try {
            status = await checkReconnectionStatus();
            reconnectModal.innerHTML = getStatusHtml(status);
        } catch {
            reconnectModal.innerHTML = config.reconnectingHtml || getDefaultReconnectingHtml();
        }
        
        // Inject custom CSS if provided
        if (config.customCss) {
            const style = document.createElement('style');
            style.textContent = config.customCss;
            reconnectModal.appendChild(style);
        }
        
        document.body.appendChild(reconnectModal);

        document.getElementById('manual-reload-btn')?.addEventListener('click', () => {
            window.location.reload();
        });
        
        // If deployment mode, start polling for completion
        if (status && isDeploying(status)) {
            console.log('[CircuitHandler] Starting deployment completion polling...');
            lastVersion = status.version;
            
            statusCheckInterval = setInterval(async () => {
                const newStatus = await checkReconnectionStatus();
                
                if (!newStatus) {
                    console.log('[CircuitHandler] Status file removed, reloading...');
                    clearInterval(statusCheckInterval);
                    window.location.reload();
                    return;
                }
                
                // Check if version changed or no longer deploying
                if (newStatus.version !== lastVersion || !isDeploying(newStatus)) {
                    console.log('[CircuitHandler] Deployment completed (status changed), reloading...');
                    clearInterval(statusCheckInterval);
                    window.location.reload();
                    return;
                }
                
                // CRITICAL: Test if new site is live by attempting circuit reconnect
                try {
                    const healthCheck = await fetch(window.location.origin + '/health', {
                        method: 'HEAD',
                        cache: 'no-cache',
                        signal: AbortSignal.timeout(3000)
                    });
                    
                    if (healthCheck.ok) {
                        console.log('[CircuitHandler] Health check OK, testing if new server is live...');
                        
                        try {
                            const reconnectResult = await Blazor.reconnect();
                            
                            if (reconnectResult === false) {
                                // Circuit rejected = new server is live
                                console.log('[CircuitHandler] New server detected (circuit rejected), reloading...');
                                clearInterval(statusCheckInterval);
                                window.location.reload();
                                return;
                            } else if (reconnectResult === true) {
                                // Reconnected to old server - keep waiting
                                console.log('[CircuitHandler] Still on old server, waiting for traffic switch...');
                            }
                        } catch (err) {
                            // Circuit error = new server
                            if (err?.toString().includes('circuit') || err?.toString().includes('expired')) {
                                console.log('[CircuitHandler] Circuit error = new server is live, reloading...');
                                clearInterval(statusCheckInterval);
                                window.location.reload();
                                return;
                            }
                        }
                    }
                } catch (healthError) {
                    console.log('[CircuitHandler] Health check failed, will retry...');
                }
            }, config.statusPollInterval);
        } else {
            // Normal reconnection mode - start countdown
            startCountdown();
        }
    }

    // Countdown timer
    let countdownInterval = null;
    let countdownSeconds = Math.ceil(currentInterval / 1000);
    
    function startCountdown() {
        countdownSeconds = Math.ceil(currentInterval / 1000);
        updateCountdownDisplay();
        
        if (countdownInterval) clearInterval(countdownInterval);
        
        countdownInterval = setInterval(() => {
            countdownSeconds--;
            updateCountdownDisplay();
            
            if (countdownSeconds <= 0) {
                countdownSeconds = Math.ceil(currentInterval / 1000);
            }
        }, 1000);
    }
    
    function updateCountdownDisplay() {
        const countdownEl = document.getElementById('countdown-seconds');
        if (countdownEl) {
            countdownEl.textContent = countdownSeconds;
        }
    }

    // Show server restart UI (auto-reloads after brief delay)
    function showServerRestartUI() {
        if (isInitialLoad) return;
        
        hideReconnectUI();
        
        const restartUI = document.createElement('div');
        restartUI.id = 'blazor-reconnect-modal';
        restartUI.innerHTML = config.serverRestartHtml || getDefaultServerRestartHtml();
        
        // Inject custom CSS if provided
        if (config.customCss) {
            const style = document.createElement('style');
            style.textContent = config.customCss;
            restartUI.appendChild(style);
        }
        
        document.body.appendChild(restartUI);
    }

    // Hide reconnection UI
    function hideReconnectUI() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        
        const modal = document.getElementById('blazor-reconnect-modal');
        if (modal) {
            modal.remove();
            reconnectModal = null;
        }
        
        // Reset interval to initial value on successful reconnection
        currentInterval = initialInterval;
    }

    // Suppress MudBlazor and expected disconnection errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        
        // Suppress known errors during disconnection
        if (message.includes('Cannot send data if the connection is not in the') ||
            message.includes('MudResizeListener') ||
            message.includes('Invocation canceled due to the underlying connection') ||
            message.includes('Failed to complete negotiation') ||
            message.includes('Failed to fetch') ||
            message.includes('Failed to start the connection') ||
            message.includes('Connection disconnected with error') ||
            message.includes('WebSocket closed with status code: 1006') ||
            message.includes('no reason given')) {
            return;
        }
        
        // Check for circuit expiry - trigger reload
        if (message.includes('circuit state could not be retrieved') ||
            (message.includes('circuit') && message.includes('expired'))) {
            console.log('[CircuitHandler] Circuit expired detected, reloading in 2 seconds...');
            
            // Show server restart UI
            if (reconnectModal) {
                reconnectModal.innerHTML = config.serverRestartHtml || getDefaultServerRestartHtml();
            }
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
            return;
        }
        
        originalConsoleError.apply(console, args);
    };

    // Infinite reconnection with exponential backoff
    let reconnectionProcess = null;

    const startReconnectionProcess = () => {
        if (reconnectionProcess) return reconnectionProcess;
        
        currentInterval = initialInterval;
        let isCanceled = false;
        let attemptCount = 0;

        reconnectionProcess = (async () => {
            while (!isCanceled) {
                attemptCount++;
                
                // Wait before attempting (except first attempt)
                if (attemptCount > 1) {
                    console.log(`[CircuitHandler] Waiting ${currentInterval}ms before attempt ${attemptCount}...`);
                    await new Promise(resolve => setTimeout(resolve, currentInterval));
                    
                    // Exponential backoff: 1s → 2s → 3s → 5s (max)
                    if (currentInterval < maxInterval) {
                        currentInterval = Math.min(currentInterval + 1000, maxInterval);
                        countdownSeconds = Math.ceil(currentInterval / 1000);
                    }
                }

                if (isCanceled) return;

                // Pause attempts while offline or tab hidden
                if (isOffline || document.hidden) {
                    const reason = isOffline ? 'offline' : 'tab hidden';
                    console.log(`[CircuitHandler] Skipping attempt (${reason})`);
                    continue;
                }

                console.log(`[CircuitHandler] Reconnect attempt ${attemptCount}/${showUIAfterAttempts} (${currentInterval}ms interval)`);

                // Only show UI after 5 attempts (silent reconnection first)
                if (attemptCount === showUIAfterAttempts) {
                    console.log('[CircuitHandler] Showing reconnection UI after 5 silent attempts');
                    await showReconnectingUI();
                }

                try {
                    const result = await Blazor.reconnect();
                    
                    if (result) {
                        // Successfully reconnected
                        console.log(`[CircuitHandler] Successfully reconnected after ${attemptCount} attempts`);
                        hideReconnectUI();
                        reconnectionProcess = null;
                        return;
                    }
                    
                    // Server reached but connection rejected - reload (only show UI if past threshold)
                    if (result === false) {
                        console.log(`[CircuitHandler] Connection rejected after ${attemptCount} attempts, reloading...`);
                        if (attemptCount >= showUIAfterAttempts) {
                            showServerRestartUI();
                        }
                        setTimeout(() => window.location.reload(), 1000);
                        return;
                    }
                } catch (error) {
                    const errorMsg = error?.toString() || '';
                    
                    // Circuit expired (server restarted) - reload (only show UI if past threshold)
                    if (errorMsg.includes('circuit state could not be retrieved') ||
                        (errorMsg.includes('circuit') && errorMsg.includes('expired'))) {
                        console.log(`[CircuitHandler] Circuit expired after ${attemptCount} attempts (server restarted), reloading...`);
                        if (attemptCount >= showUIAfterAttempts) {
                            showServerRestartUI();
                        }
                        setTimeout(() => window.location.reload(), 1000);
                        return;
                    }
                    
                    console.log(`[CircuitHandler] Reconnection attempt ${attemptCount} failed, will retry...`);
                }
            }
        })();

        return {
            cancel: () => {
                isCanceled = true;
                hideReconnectUI();
                reconnectionProcess = null;
            }
        };
    };

    // Network online/offline awareness to improve reliability
    window.addEventListener('offline', () => {
        isOffline = true;
        console.log('[CircuitHandler] Browser is offline; pausing reconnection attempts');
        if (!reconnectModal && !isInitialLoad) {
            // Show lightweight offline notice
            reconnectModal = document.createElement('div');
            reconnectModal.id = 'blazor-reconnect-modal';
            reconnectModal.innerHTML = `
                <div style='position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center;'>
                    <div style='background: white; padding: 2rem; border-radius: 8px; text-align: center; max-width: 420px;'>
                        <h3 style='margin: 0 0 0.5rem; color: #333;'>No internet connection</h3>
                        <p style='margin: 0; color: #666;'>We will reconnect automatically when you're back online.</p>
                    </div>
                </div>`;
            document.body.appendChild(reconnectModal);
        }
    });
    window.addEventListener('online', async () => {
        isOffline = false;
        console.log('[CircuitHandler] Browser is online; resuming reconnection attempts');
        // Replace offline notice with proper reconnection UI/status
        if (reconnectModal) {
            try {
                const status = await checkReconnectionStatus();
                reconnectModal.innerHTML = getStatusHtml(status);
            } catch {
                // keep existing UI
            }
        }
        // Reset backoff for quicker retry after regaining connectivity
        currentInterval = initialInterval;
    });

    // Check if Blazor has already started (handles autostart scenarios)
    if (window.Blazor && typeof window.Blazor._internal !== 'undefined') {
        console.log('[CircuitHandler] Already started, hooking into existing reconnection system');
        
        // Listen for circuit expiry errors and auto-reload
        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason?.toString() || '';
            if (error.includes('circuit state could not be retrieved') || 
                error.includes('circuit') && error.includes('expired')) {
                console.log('[CircuitHandler] Circuit expired, reloading page in 2 seconds...');
                event.preventDefault();
                
                // Show server restart UI briefly before reload
                if (reconnectModal) {
                    reconnectModal.innerHTML = config.serverRestartHtml || getDefaultServerRestartHtml();
                }
                
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        });
        
        // Monitor for the default Blazor reconnect modal and replace it with ours
        const observer = new MutationObserver(async () => {
            const defaultModal = document.getElementById('components-reconnect-modal');
            if (defaultModal && !isInitialLoad) {
                console.log('[CircuitHandler] Default reconnect modal detected, loading status...');
                
                // Load reconnection status
                reconnectionStatus = await checkReconnectionStatus();
                const deploymentMode = isDeploying(reconnectionStatus);
                
                if (deploymentMode) {
                    console.log('[CircuitHandler] Deployment mode - showing deployment UI');
                } else {
                    console.log('[CircuitHandler] Normal mode - showing reconnection UI');
                }
                
                defaultModal.style.display = 'none';
                
                if (!reconnectModal) {
                    reconnectModal = document.createElement('div');
                    reconnectModal.id = 'blazor-reconnect-modal';
                    reconnectModal.innerHTML = getStatusHtml(reconnectionStatus);
                    
                    if (config.customCss) {
                        const style = document.createElement('style');
                        style.textContent = config.customCss;
                        reconnectModal.appendChild(style);
                    }
                    
                    document.body.appendChild(reconnectModal);
                    
                    if (deploymentMode) {
                        // Poll for deployment completion
                        lastVersion = reconnectionStatus?.version;
                        statusCheckInterval = setInterval(async () => {
                            const status = await checkReconnectionStatus();
                            if (!status) {
                                console.log('[CircuitHandler] Status file removed, reloading...');
                                clearInterval(statusCheckInterval);
                                window.location.reload();
                                return;
                            }
                            
                            // Check if version changed or no longer deploying
                            if (status.version !== lastVersion || !isDeploying(status)) {
                                console.log('[CircuitHandler] Deployment completed (version or status changed), reloading...');
                                clearInterval(statusCheckInterval);
                                window.location.reload();
                                return;
                            }
                            
                            // CRITICAL: Check if new site is responding (blue-green traffic switch)
                            // Even if status file still says "deploying", the new container might be live
                            try {
                                const healthCheck = await fetch(window.location.origin + '/health', {
                                    method: 'HEAD',
                                    cache: 'no-cache',
                                    signal: AbortSignal.timeout(3000)
                                });
                                
                                // Check if we're hitting a different container (new deployment)
                                // by trying to reconnect - if circuit is rejected, it means new server
                                if (healthCheck.ok) {
                                    console.log('[CircuitHandler] Health check OK, testing circuit...');
                                    
                                    try {
                                        const reconnectResult = await Blazor.reconnect();
                                        
                                        if (reconnectResult === false) {
                                            // Circuit rejected = new server version is live
                                            console.log('[CircuitHandler] New server detected (circuit rejected), reloading...');
                                            clearInterval(statusCheckInterval);
                                            window.location.reload();
                                            return;
                                        } else if (reconnectResult === true) {
                                            // Successfully reconnected to old server - keep waiting
                                            console.log('[CircuitHandler] Still connected to old server, waiting for traffic switch...');
                                        }
                                    } catch (err) {
                                        // Circuit error = likely new server
                                        if (err?.toString().includes('circuit') || err?.toString().includes('expired')) {
                                            console.log('[CircuitHandler] Circuit error detected, new server is live, reloading...');
                                            clearInterval(statusCheckInterval);
                                            window.location.reload();
                                            return;
                                        }
                                    }
                                }
                            } catch (healthError) {
                                console.log('[CircuitHandler] Health check failed (site may be switching), will retry...');
                            }
                        }, config.statusPollInterval);
                    } else {
                        // Setup manual reload button for normal reconnection
                        const reloadBtn = document.getElementById('manual-reload-btn');
                        if (reloadBtn) {
                            reloadBtn.onclick = () => window.location.reload();
                        }
                        
                        // Start actual reconnection attempts with exponential backoff
                        let attemptCount = 0;
                        let reconnectInterval = initialInterval;
                        let reconnectTimeout = null;
                        let isPaused = false; // Paused when tab is not visible
                        
                        const attemptReconnect = async () => {
                            if (isOffline) {
                                console.log('[CircuitHandler] Skipping attempt (offline)');
                                scheduleNextAttempt();
                                return;
                            }
                            if (isPaused) {
                                console.log('[CircuitHandler] Skipping attempt (tab is not visible)');
                                scheduleNextAttempt();
                                return;
                            }
                            
                            attemptCount++;
                            console.log(`[CircuitHandler] Reconnection attempt ${attemptCount} (interval: ${reconnectInterval}ms)`);
                            
                            try {
                                const result = await Blazor.reconnect();
                                
                                if (result) {
                                    console.log(`[CircuitHandler] Successfully reconnected after ${attemptCount} attempts`);
                                    hideReconnectUI();
                                    return;
                                }
                            } catch (error) {
                                console.log(`[CircuitHandler] Attempt ${attemptCount} failed:`, error?.toString());
                            }
                            
                            // Check if modal still exists
                            if (document.getElementById('components-reconnect-modal')) {
                                scheduleNextAttempt();
                            } else {
                                console.log('[CircuitHandler] Connection restored (default modal gone)');
                                if (reconnectModal) {
                                    reconnectModal.remove();
                                    reconnectModal = null;
                                }
                            }
                        };
                        
                        const scheduleNextAttempt = () => {
                            if (reconnectTimeout) clearTimeout(reconnectTimeout);
                            
                            // Update countdown display
                            const countdownElement = document.getElementById('countdown-seconds');
                            if (countdownElement) {
                                let countdown = Math.ceil(reconnectInterval / 1000);
                                countdownElement.textContent = countdown;
                                
                                const countdownInterval = setInterval(() => {
                                    countdown--;
                                    if (countdownElement && countdown > 0) {
                                        countdownElement.textContent = countdown;
                                    } else {
                                        clearInterval(countdownInterval);
                                    }
                                }, 1000);
                            }
                            
                            // Schedule next attempt
                            reconnectTimeout = setTimeout(() => {
                                // Exponential backoff: 1s → 2s → 3s → 5s (max)
                                if (reconnectInterval < maxInterval) {
                                    reconnectInterval = Math.min(reconnectInterval + 1000, maxInterval);
                                }
                                attemptReconnect();
                            }, reconnectInterval);
                        };
                        
                        // Handle tab visibility (pause/resume reconnection attempts)
                        document.addEventListener('visibilitychange', () => {
                            if (document.hidden) {
                                console.log('[CircuitHandler] Tab hidden, pausing reconnection attempts');
                                isPaused = true;
                                if (reconnectTimeout) {
                                    clearTimeout(reconnectTimeout);
                                    reconnectTimeout = null;
                                }
                            } else {
                                console.log('[CircuitHandler] Tab visible again, resuming reconnection attempts');
                                isPaused = false;
                                // Resume immediately
                                attemptReconnect();
                            }
                        });
                        
                        // Start first attempt
                        scheduleNextAttempt();
                    }
                }
            } else if (!defaultModal && reconnectModal) {
                // Default modal removed = connection restored
                console.log('[CircuitHandler] Connection restored, hiding custom UI');
                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                }
                reconnectModal.remove();
                reconnectModal = null;
                reconnectionStatus = null;
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Mark initial load complete after brief delay
        setTimeout(() => {
            isInitialLoad = false;
            console.log('[CircuitHandler] Custom reconnection handler active (monitoring mode)');
        }, 1000);
        
        return;
    }

    // Start Blazor with custom reconnection handler
    Blazor.start({
        circuit: {
            reconnectionHandler: {
                onConnectionDown: (options, error) => {
                    if (isInitialLoad) return;
                    console.log('[CircuitHandler] Connection down, starting infinite reconnection');
                    startReconnectionProcess();
                },
                onConnectionUp: () => {
                    if (isInitialLoad) return;
                    console.log('[CircuitHandler] Connection restored');
                    
                    if (reconnectionProcess && reconnectionProcess.cancel) {
                        reconnectionProcess.cancel();
                    }
                    
                    hideReconnectUI();
                }
            }
        }
    }).then(() => {
        // Mark initial load complete after 1 second
        setTimeout(() => {
            isInitialLoad = false;
            console.log('[CircuitHandler] Initial connection established, infinite reconnection handler active');
            
            // Start version polling after connection is stable
            startVersionPolling();
            
            // Start connection health monitoring (for testing/debugging)
            startConnectionMonitor();
        }, 1000);
    });

    // Handle unhandled promise rejections for circuit errors
    window.addEventListener('unhandledrejection', (event) => {
        if (isInitialLoad) return;

        const error = event.reason?.toString() || '';
        
        // Circuit expired (server restarted) - suppress and let reconnection handler deal with it
        if (error.includes('circuit state could not be retrieved') ||
            (error.includes('circuit') && error.includes('expired'))) {
            console.log('[CircuitHandler] Circuit expired error detected (suppressed, handled by reconnection process)');
            event.preventDefault();
            return;
        }
        
        // Suppress other circuit-related errors during reconnection
        if (error.includes('circuit') || 
            error.includes('connection being closed') ||
            error.includes('Connection disconnected') ||
            error.includes('Invocation canceled')) {
            console.log('[CircuitHandler] Suppressed expected circuit error during reconnection');
            event.preventDefault();
        }
    });

    // 🧪 TESTING API - Expose methods for manual testing in browser console
    window.BlazorReconnectionTest = {
        /**
         * Force disconnect the Blazor circuit to test reconnection UI
         * Usage: BlazorReconnectionTest.disconnect()
         */
        disconnect: () => {
            console.log('[Blazor Test] 🔌 Forcing circuit disconnect...');
            try {
                // Access the internal Blazor connection and stop it
                const blazor = window.Blazor;
                if (blazor?._internal?.dotNetExports?.INTERNAL?.getConnection) {
                    const connection = blazor._internal.dotNetExports.INTERNAL.getConnection();
                    connection.stop();
                    console.log('[Blazor Test] ✅ Circuit disconnected. Reconnection UI should appear.');
                } else {
                    console.error('[Blazor Test] ❌ Could not access Blazor connection. Make sure Blazor is started.');
                }
            } catch (err) {
                console.error('[Blazor Test] ❌ Error disconnecting:', err);
            }
        },

        /**
         * Simulate network going offline
         * Usage: BlazorReconnectionTest.goOffline()
         */
        goOffline: () => {
            console.log('[Blazor Test] 📡 Simulating offline mode...');
            window.dispatchEvent(new Event('offline'));
            console.log('[Blazor Test] ✅ Offline event dispatched. UI should reflect offline state.');
        },

        /**
         * Simulate network coming back online
         * Usage: BlazorReconnectionTest.goOnline()
         */
        goOnline: () => {
            console.log('[Blazor Test] 📡 Simulating online mode...');
            window.dispatchEvent(new Event('online'));
            console.log('[Blazor Test] ✅ Online event dispatched. Reconnection should attempt.');
        },

        /**
         * Show current reconnection status and configuration
         * Usage: BlazorReconnectionTest.status()
         */
        status: () => {
            console.log('[Blazor Test] 📊 Current Status:', {
                isOnline: navigator.onLine,
                reconnectionStatus: reconnectionStatus,
                config: config,
                lastVersion: lastVersion,
                initialVersion: initialVersion,
                versionBannerVisible: !!versionBanner,
                modalVisible: reconnectModal?.style?.display !== 'none'
            });
        },

        /**
         * Force refresh the status from server
         * Usage: BlazorReconnectionTest.refreshStatus()
         */
        refreshStatus: async () => {
            console.log('[Blazor Test] 🔄 Refreshing reconnection status from server...');
            const status = await checkReconnectionStatus();
            console.log('[Blazor Test] ✅ Status refreshed:', status);
            return status;
        },

        /**
         * Simulate a version change to test the update banner
         * Usage: BlazorReconnectionTest.simulateVersionChange('1.0.999')
         */
        simulateVersionChange: (newVersion) => {
            console.log(`[Blazor Test] 🎭 Simulating version change: ${initialVersion} → ${newVersion}`);
            if (!initialVersion) {
                console.warn('[Blazor Test] ⚠️ Initial version not set yet. Wait a moment after page load.');
                return;
            }
            showVersionBanner(newVersion);
        },

        /**
         * Hide the version update banner
         * Usage: BlazorReconnectionTest.hideVersionBanner()
         */
        hideVersionBanner: () => {
            console.log('[Blazor Test] 🙈 Hiding version banner');
            hideVersionBanner();
        },

        /**
         * Stop connection health monitor
         * Usage: BlazorReconnectionTest.stopMonitor()
         */
        stopMonitor: () => {
            console.log('[Blazor Test] 🛑 Stopping connection health monitor');
            stopConnectionMonitor();
        },

        /**
         * Start connection health monitor
         * Usage: BlazorReconnectionTest.startMonitor()
         */
        startMonitor: () => {
            console.log('[Blazor Test] ▶️  Starting connection health monitor');
            startConnectionMonitor();
        }
    };

    console.log('[CircuitHandler] 🧪 Testing API available: BlazorReconnectionTest.disconnect(), .goOffline(), .goOnline(), .status(), .refreshStatus(), .simulateVersionChange(), .hideVersionBanner(), .stopMonitor(), .startMonitor()');
})();
