/**
 * Blazor Server Reconnection Handler
 * Infinite reconnection with exponential backoff (1s → 3s → 5s max)
 * Only shows UI after 5 failed attempts for better UX during quick reconnects
 * Follows official Microsoft guidance from:
 * https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/signalr
 * Works with MudBlazor 8.15+ and .NET 10
 */

(() => {
    const initialInterval = 1000;  // Start at 1 second
    const maxInterval = 5000;      // Max 5 seconds between attempts
    const showUIAfterAttempts = 5; // Only show UI after 5 silent attempts
    let isInitialLoad = true;
    let reconnectModal = null;
    let currentInterval = initialInterval;

    // Show reconnection UI (simplified, no attempt counter)
    function showReconnectingUI() {
        if (isInitialLoad || reconnectModal) return;

        reconnectModal = document.createElement('div');
        reconnectModal.id = 'blazor-reconnect-modal';
        reconnectModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                        background: rgba(0, 0, 0, 0.7); z-index: 9999; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 2rem; border-radius: 8px; 
                            max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" 
                         viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="#594AE2" stroke-width="3" 
                                stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/>
                    </svg>
                    <h3 style="margin: 0 0 0.5rem; color: #333; font-size: 1.25rem;">Connection Lost</h3>
                    <p id="reconnect-status" style="margin: 0 0 0.25rem; color: #666; font-size: 0.95rem;">
                        Reconnecting...
                    </p>
                    <p id="reconnect-countdown" style="margin: 0 0 1rem; color: #999; font-size: 0.85rem;">
                        Next attempt in <span id="countdown-seconds">1</span>s
                    </p>
                    <button id="manual-reload-btn" style="background: #594AE2; color: white; border: none; 
                                                           padding: 0.5rem 1.5rem; border-radius: 4px; 
                                                           cursor: pointer; font-size: 0.95rem;">
                        Reload Now
                    </button>
                </div>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;
        document.body.appendChild(reconnectModal);

        document.getElementById('manual-reload-btn')?.addEventListener('click', () => {
            window.location.reload();
        });
        
        startCountdown();
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
        restartUI.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                        background: rgba(0, 0, 0, 0.7); z-index: 9999; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 2rem; border-radius: 8px; 
                            max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite;" 
                         viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="#4CAF50" stroke-width="3" 
                                stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/>
                    </svg>
                    <h3 style="margin: 0 0 0.5rem; color: #333; font-size: 1.25rem;">Reconnecting...</h3>
                    <p style="margin: 0 0 1rem; color: #666; font-size: 0.95rem;">
                        Please wait a moment...
                    </p>
                </div>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;
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
                    console.log(`[Blazor] Waiting ${currentInterval}ms before attempt ${attemptCount}...`);
                    await new Promise(resolve => setTimeout(resolve, currentInterval));
                    
                    // Exponential backoff: 1s → 2s → 3s → 5s (max)
                    if (currentInterval < maxInterval) {
                        currentInterval = Math.min(currentInterval + 1000, maxInterval);
                        countdownSeconds = Math.ceil(currentInterval / 1000);
                    }
                }

                if (isCanceled) return;

                console.log(`[Blazor] Reconnect attempt ${attemptCount}/${showUIAfterAttempts} (${currentInterval}ms interval)`);

                // Only show UI after 5 attempts (silent reconnection first)
                if (attemptCount === showUIAfterAttempts) {
                    console.log('[Blazor] Showing reconnection UI after 5 silent attempts');
                    showReconnectingUI();
                }

                try {
                    const result = await Blazor.reconnect();
                    
                    if (result) {
                        // Successfully reconnected
                        console.log(`[Blazor] Successfully reconnected after ${attemptCount} attempts`);
                        hideReconnectUI();
                        reconnectionProcess = null;
                        return;
                    }
                    
                    // Server reached but connection rejected - reload (only show UI if past threshold)
                    if (result === false) {
                        console.log(`[Blazor] Connection rejected after ${attemptCount} attempts, reloading...`);
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
                        console.log(`[Blazor] Circuit expired after ${attemptCount} attempts (server restarted), reloading...`);
                        if (attemptCount >= showUIAfterAttempts) {
                            showServerRestartUI();
                        }
                        setTimeout(() => window.location.reload(), 1000);
                        return;
                    }
                    
                    console.log(`[Blazor] Reconnection attempt ${attemptCount} failed, will retry...`);
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

    // Start Blazor with custom reconnection handler
    Blazor.start({
        circuit: {
            reconnectionHandler: {
                onConnectionDown: (options, error) => {
                    if (isInitialLoad) return;
                    console.log('[Blazor] Connection down, starting infinite reconnection');
                    startReconnectionProcess();
                },
                onConnectionUp: () => {
                    if (isInitialLoad) return;
                    console.log('[Blazor] Connection restored');
                    
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
            console.log('[Blazor] Initial connection established, infinite reconnection handler active');
        }, 1000);
    });

    // Handle unhandled promise rejections for circuit errors
    window.addEventListener('unhandledrejection', (event) => {
        if (isInitialLoad) return;

        const error = event.reason?.toString() || '';
        
        // Circuit expired (server restarted) - suppress and let reconnection handler deal with it
        if (error.includes('circuit state could not be retrieved') ||
            (error.includes('circuit') && error.includes('expired'))) {
            console.log('[Blazor] Circuit expired error detected (suppressed, handled by reconnection process)');
            event.preventDefault();
            return;
        }
        
        // Suppress other circuit-related errors during reconnection
        if (error.includes('circuit') || 
            error.includes('connection being closed') ||
            error.includes('Connection disconnected') ||
            error.includes('Invocation canceled')) {
            console.log('[Blazor] Suppressed expected circuit error during reconnection');
            event.preventDefault();
        }
    });
})();
