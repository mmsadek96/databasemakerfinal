/**
 * Binance integration view controller
 * @module binance
 */

import API from './api.js';
import { formatCurrency, formatNumber, debounce } from './utils.js';
import App from './app.js';

/**
 * Binance view controller
 */
const BinanceView = {
    /**
     * Current account information
     */
    accountInfo: null,

    /**
     * Current open orders
     */
    openOrders: [],

    /**
     * Available trading pairs
     */
    tradingPairs: [],

    /**
     * Connection status
     */
    connectionStatus: {
        connected: false,
        message: 'Not connected'
    },

    /**
     * Initialize the Binance view
     */
    initialize: function() {
        console.log('Initializing Binance view');

        // Set up event listeners
        this.setupEventListeners();

        // Check connection status on init
        this.checkConnectionStatus();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Save API credentials
        document.getElementById('save-binance-credentials').addEventListener('click', () => {
            this.saveBinanceCredentials();
        });

        // Test connection button
        document.getElementById('test-binance-connection').addEventListener('click', () => {
            this.testConnection();
        });

        // Refresh account data
        document.getElementById('refresh-account-data').addEventListener('click', () => {
            this.loadAccountInfo();
        });

        // Refresh open orders
        document.getElementById('refresh-open-orders').addEventListener('click', () => {
            this.loadOpenOrders();
        });

        // Show/hide API secret
        document.getElementById('toggle-api-secret').addEventListener('click', () => {
            const secretInput = document.getElementById('binance-api-secret');
            const icon = document.getElementById('toggle-api-secret').querySelector('i');

            if (secretInput.type === 'password') {
                secretInput.type = 'text';
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            } else {
                secretInput.type = 'password';
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        });

        // Filter balances
        document.getElementById('filter-balances').addEventListener('input', debounce((e) => {
            this.filterBalances(e.target.value);
        }, 300));

        // Toggle zero balances
        document.getElementById('toggle-zero-balances').addEventListener('change', (e) => {
            this.toggleZeroBalances(e.target.checked);
        });
    },

    /**
     * Check connection status
     */
    checkConnectionStatus: function() {
        API.testBinanceConnection()
            .then(data => {
                this.connectionStatus = {
                    connected: data.status === 'success',
                    message: data.message,
                    details: data
                };

                // Update UI based on connection status
                this.updateConnectionStatusUI();

                // If connected, load account info
                if (this.connectionStatus.connected) {
                    this.loadAccountInfo();
                    this.loadOpenOrders();
                }
            })
            .catch(error => {
                console.error('Error testing connection:', error);
                this.connectionStatus = {
                    connected: false,
                    message: `Connection error: ${error.message || 'Unknown error'}`
                };
                this.updateConnectionStatusUI();
            });
    },

    /**
     * Update connection status UI
     */
    updateConnectionStatusUI: function() {
        const statusElement = document.getElementById('binance-connection-status');
        const statusContainer = document.getElementById('binance-status-container');

        if (statusElement) {
            if (this.connectionStatus.connected) {
                statusElement.textContent = 'Connected';
                statusElement.className = 'text-success';
                statusContainer.classList.remove('bg-danger-subtle');
                statusContainer.classList.add('bg-success-subtle');
            } else {
                statusElement.textContent = 'Not Connected';
                statusElement.className = 'text-danger';
                statusContainer.classList.remove('bg-success-subtle');
                statusContainer.classList.add('bg-danger-subtle');
            }
        }

        const statusMessageElement = document.getElementById('binance-connection-message');
        if (statusMessageElement) {
            statusMessageElement.textContent = this.connectionStatus.message;
        }

        // Show/hide account panels based on connection status
        const accountPanel = document.getElementById('binance-account-panel');
        const ordersPanel = document.getElementById('binance-orders-panel');

        if (accountPanel) {
            if (this.connectionStatus.connected) {
                accountPanel.classList.remove('d-none');
            } else {
                accountPanel.classList.add('d-none');
            }
        }

        if (ordersPanel) {
            if (this.connectionStatus.connected) {
                ordersPanel.classList.remove('d-none');
            } else {
                ordersPanel.classList.add('d-none');
            }
        }
    },

    /**
     * Save Binance API credentials
     */
    saveBinanceCredentials: function() {
        const apiKey = document.getElementById('binance-api-key').value.trim();
        const apiSecret = document.getElementById('binance-api-secret').value.trim();
        const allowedIps = document.getElementById('binance-allowed-ips').value.trim();

        if (!apiKey || !apiSecret) {
            window.FinancialHub.notification('API Key and Secret are required', 'error');
            return;
        }

        // Parse allowed IPs (comma-separated list)
        const allowedIpList = allowedIps ? allowedIps.split(',').map(ip => ip.trim()) : [];

        // Show saving indicator
        const saveButton = document.getElementById('save-binance-credentials');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        saveButton.disabled = true;

        API.setBinanceCredentials(apiKey, apiSecret, allowedIpList)
            .then(data => {
                console.log('Credentials saved:', data);
                window.FinancialHub.notification('Binance credentials saved successfully', 'success');

                // Update connection status based on the test result
                this.connectionStatus = {
                    connected: data.connection_test.status === 'success',
                    message: data.connection_test.message,
                    details: data.connection_test
                };

                this.updateConnectionStatusUI();

                // If connected, load account data
                if (this.connectionStatus.connected) {
                    this.loadAccountInfo();
                    this.loadOpenOrders();
                }
            })
            .catch(error => {
                console.error('Error saving credentials:', error);
                window.FinancialHub.notification(`Error saving credentials: ${error.message || 'Unknown error'}`, 'error');
            })
            .finally(() => {
                // Restore button
                saveButton.innerHTML = originalText;
                saveButton.disabled = false;
            });
    },

    /**
     * Test Binance API connection
     */
    testConnection: function() {
        const testButton = document.getElementById('test-binance-connection');
        const originalText = testButton.innerHTML;
        testButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Testing...';
        testButton.disabled = true;

        API.testBinanceConnection()
            .then(data => {
                console.log('Connection test result:', data);

                // Update connection status
                this.connectionStatus = {
                    connected: data.status === 'success',
                    message: data.message,
                    details: data
                };

                this.updateConnectionStatusUI();

                // Show notification based on connection status
                if (this.connectionStatus.connected) {
                    window.FinancialHub.notification('Successfully connected to Binance API', 'success');

                    // Load account data if connected
                    this.loadAccountInfo();
                    this.loadOpenOrders();
                } else {
                    window.FinancialHub.notification(`Connection failed: ${data.message}`, 'error');
                }
            })
            .catch(error => {
                console.error('Error testing connection:', error);
                window.FinancialHub.notification(`Error testing connection: ${error.message || 'Unknown error'}`, 'error');

                // Update connection status
                this.connectionStatus = {
                    connected: false,
                    message: `Connection error: ${error.message || 'Unknown error'}`
                };

                this.updateConnectionStatusUI();
            })
            .finally(() => {
                // Restore button
                testButton.innerHTML = originalText;
                testButton.disabled = false;
            });
    },

    /**
     * Load account information
     */
    loadAccountInfo: function() {
        // Show loading state
        const accountPanel = document.getElementById('binance-account-panel');
        const tableBody = document.getElementById('binance-balances-body');

        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading account data...</td></tr>';
        }

        API.getBinanceAccount()
            .then(data => {
                console.log('Account info:', data);
                this.accountInfo = data;

                // Update UI with account info
                this.updateAccountInfoUI();
            })
            .catch(error => {
                console.error('Error loading account info:', error);
                window.FinancialHub.notification(`Error loading account info: ${error.message || 'Unknown error'}`, 'error');

                if (tableBody) {
                    tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger"><i class="bi bi-exclamation-triangle"></i> Error loading account data: ${error.message || 'Unknown error'}</td></tr>`;
                }
            });
    },

    /**
     * Update account information UI
     */
    updateAccountInfoUI: function() {
        if (!this.accountInfo) {
            return;
        }

        const tableBody = document.getElementById('binance-balances-body');
        if (!tableBody) {
            return;
        }

        // Clear table
        tableBody.innerHTML = '';

        // Get balances with non-zero values
        let balances = this.accountInfo.balances || [];

        // Sort balances by value (descending)
        balances.sort((a, b) => {
            const aTotal = parseFloat(a.free) + parseFloat(a.locked);
            const bTotal = parseFloat(b.free) + parseFloat(b.locked);
            return bTotal - aTotal;
        });

        // Check if we should show zero balances
        const showZeroBalances = document.getElementById('toggle-zero-balances').checked;

        if (!showZeroBalances) {
            balances = balances.filter(balance =>
                parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
            );
        }

        // Apply current filter if exists
        const currentFilter = document.getElementById('filter-balances').value.trim().toUpperCase();
        if (currentFilter) {
            balances = balances.filter(balance =>
                balance.asset.toUpperCase().includes(currentFilter)
            );
        }

        // Add rows for balances
        let totalEstimatedValue = 0;

        if (balances.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No balances to display</td></tr>';
        } else {
            balances.forEach(balance => {
                const row = document.createElement('tr');

                // Calculate total
                const free = parseFloat(balance.free);
                const locked = parseFloat(balance.locked);
                const total = free + locked;

                // Estimated USD value would require price data, placeholder for now
                const estimatedValue = 0; // This would need to be calculated with price data
                totalEstimatedValue += estimatedValue;

                row.innerHTML = `
                    <td>${balance.asset}</td>
                    <td class="text-end">${formatNumber(free, 8)}</td>
                    <td class="text-end">${formatNumber(locked, 8)}</td>
                    <td class="text-end fw-bold">${formatNumber(total, 8)}</td>
                `;

                tableBody.appendChild(row);
            });
        }

        // Update account summary
        const accountSummary = document.getElementById('binance-account-summary');
        if (accountSummary) {
            accountSummary.innerHTML = `
                <div class="mb-3">
                    <strong>Account Type:</strong> ${this.accountInfo.accountType || 'Standard'}
                </div>
                <div class="mb-3">
                    <strong>Trading Status:</strong> ${this.accountInfo.canTrade ? '<span class="text-success">Enabled</span>' : '<span class="text-danger">Disabled</span>'}
                </div>
                <div class="mb-3">
                    <strong>Withdrawal Status:</strong> ${this.accountInfo.canWithdraw ? '<span class="text-success">Enabled</span>' : '<span class="text-danger">Disabled</span>'}
                </div>
                <div class="mb-3">
                    <strong>Deposit Status:</strong> ${this.accountInfo.canDeposit ? '<span class="text-success">Enabled</span>' : '<span class="text-danger">Disabled</span>'}
                </div>
                <div class="mb-3">
                    <strong>Commission Rates:</strong>
                    <ul class="mb-0 list-unstyled ps-3">
                        <li>Maker: ${this.accountInfo.makerCommission / 100}%</li>
                        <li>Taker: ${this.accountInfo.takerCommission / 100}%</li>
                        <li>Buyer: ${this.accountInfo.buyerCommission / 100}%</li>
                        <li>Seller: ${this.accountInfo.sellerCommission / 100}%</li>
                    </ul>
                </div>
                <div class="mb-3">
                    <strong>Last Update:</strong> ${new Date(this.accountInfo.updateTime).toLocaleString()}
                </div>
            `;
        }
    },

    /**
     * Load open orders
     */
    loadOpenOrders: function() {
        // Show loading state
        const ordersTableBody = document.getElementById('binance-orders-body');

        if (ordersTableBody) {
            ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading open orders...</td></tr>';
        }

        API.getBinanceOpenOrders()
            .then(data => {
                console.log('Open orders:', data);
                this.openOrders = data;

                // Update UI with open orders
                this.updateOpenOrdersUI();
            })
            .catch(error => {
                console.error('Error loading open orders:', error);

                if (ordersTableBody) {
                    ordersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger"><i class="bi bi-exclamation-triangle"></i> Error loading open orders: ${error.message || 'Unknown error'}</td></tr>`;
                }
            });
    },

    /**
     * Update open orders UI
     */
    updateOpenOrdersUI: function() {
        const ordersTableBody = document.getElementById('binance-orders-body');
        if (!ordersTableBody) {
            return;
        }

        // Clear table
        ordersTableBody.innerHTML = '';

        // Add rows for orders
        if (!this.openOrders || this.openOrders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No open orders</td></tr>';
            return;
        }

        this.openOrders.forEach(order => {
            const row = document.createElement('tr');

            // Calculate filled percentage
            const origQty = parseFloat(order.origQty);
            const executedQty = parseFloat(order.executedQty);
            const filledPercentage = origQty > 0 ? (executedQty / origQty) * 100 : 0;

            // Determine side class
            const sideClass = order.side.toLowerCase() === 'buy' ? 'text-success' : 'text-danger';

            row.innerHTML = `
                <td>${order.symbol}</td>
                <td class="${sideClass}">${order.side}</td>
                <td>${order.type}</td>
                <td class="text-end">${formatNumber(order.price)}</td>
                <td class="text-end">${formatNumber(order.origQty)}</td>
                <td class="text-end">${formatNumber(executedQty)} (${filledPercentage.toFixed(2)}%)</td>
                <td>${new Date(order.time).toLocaleString()}</td>
            `;

            ordersTableBody.appendChild(row);
        });
    },

    /**
     * Filter balances based on search term
     * @param {string} searchTerm - Search term to filter by
     */
    filterBalances: function(searchTerm) {
        // Re-render account info with filter applied
        this.updateAccountInfoUI();
    },

    /**
     * Toggle showing zero balances
     * @param {boolean} show - Whether to show zero balances
     */
    toggleZeroBalances: function(show) {
        // Re-render account info with zero balance setting applied
        this.updateAccountInfoUI();
    }
};

export default BinanceView;