/**
 * IBKR view controller
 * @module ibkr
 */

import API from './api.js';
import { formatCurrency, formatPercentage, formatNumber, formatDate } from './utils.js';
import App from './app.js';

/**
 * IBKR view controller
 */
const IBKRView = {
    /**
     * Chart instances for account performance
     */
    performanceChart: null,
    returnsChart: null,

    /**
     * Initialize the IBKR view
     */
    initialize: function() {
        console.log('Initializing IBKR view');
        // Set up event listeners
        this.setupEventListeners();

        // Initialize charts
        this.initializeCharts();

        // Load initial data
        this.loadAccountSummary();
        this.loadPositions();
        this.loadPerformance();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Refresh data button
        document.getElementById('refresh-ibkr-data').addEventListener('click', () => {
            this.refreshAllData();
        });
        // Test TWS connection button
        document.getElementById('test-ibkr-connection').addEventListener('click', () => {
            App.showNotification('Testing TWS connection...', 'info');
            API.get('/api/ibkr/test-connection')
                .then(resp => {
                    if (resp.success) {
                        App.showNotification(resp.message, 'success');
                    } else {
                        App.showNotification('Connection failed: ' + resp.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error testing TWS connection:', error);
                    App.showNotification('Error testing connection: ' + error.message, 'error');
                });
        });

        // Orders filter
        document.getElementById('orders-filter').addEventListener('change', (e) => {
            const status = e.target.value;
            this.loadOrders(status);
        });

        // Performance period selector
        document.getElementById('performance-period').addEventListener('change', (e) => {
            const period = e.target.value;
            this.loadPerformance(period);
        });

        // Trade history period
        document.getElementById('trade-history-days').addEventListener('change', (e) => {
            const days = parseInt(e.target.value);
            this.loadTradeHistory(days);
        });

        // Symbol search for market data
        document.getElementById('ibkr-search-button').addEventListener('click', () => {
            const symbol = document.getElementById('ibkr-symbol-input').value.trim();
            if (symbol) {
                this.searchSymbols(symbol);
            }
        });

        // Symbol search on Enter key
        document.getElementById('ibkr-symbol-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('ibkr-search-button').click();
            }
        });

        // Place order button (modal open)
        document.getElementById('open-place-order-modal').addEventListener('click', () => {
            this.prepareOrderModal();
        });

        // Submit order form
        document.getElementById('place-order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder();
        });
    },

    /**
     * Initialize charts for account performance (if canvases exist)
     */
    initializeCharts: function() {
        // Initialize performance chart if canvas is present
        const perfEl = document.getElementById('account-performance-chart');
        if (perfEl && perfEl.getContext) {
            const performanceCtx = perfEl.getContext('2d');
            this.performanceChart = new Chart(performanceCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Account Value',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.1,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Account Performance' },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `Value: ${formatCurrency(ctx.parsed.y)}`
                            }
                        }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Date' } },
                        y: { title: { display: true, text: 'Value ($)' }, beginAtZero: false }
                    }
                }
            });
        }
        // Initialize returns by asset class chart if canvas is present
        const returnsEl = document.getElementById('returns-chart');
        if (returnsEl && returnsEl.getContext) {
            const returnsCtx = returnsEl.getContext('2d');
            this.returnsChart = new Chart(returnsCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Return %',
                        data: [],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(153, 102, 255, 0.6)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Returns by Asset Class' },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `Return: ${formatPercentage(ctx.parsed.y)}`
                            }
                        }
                    },
                    scales: { y: { title: { display: true, text: 'Return %' } } }
                }
            });
        }
    },

    /**
     * Refresh all data
     */
    refreshAllData: function() {
        App.showNotification('Refreshing IBKR account data...', 'info');

        this.loadAccountSummary();
        this.loadPositions();
        this.loadOrders();
        this.loadTradeHistory();

        const period = document.getElementById('performance-period').value;
        this.loadPerformance(period);
    },

    /**
     * Load account summary data
     */
    loadAccountSummary: function() {
        document.getElementById('account-summary').innerHTML =
            '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>';

        API.get('/api/ibkr/account/summary')
            .then(data => {
                this.updateAccountSummary(data);
            })
            .catch(error => {
                console.error('Error loading IBKR account summary:', error);
                document.getElementById('account-summary').innerHTML =
                    `<div class="alert alert-danger">Error loading account summary: ${error.message}</div>`;
            });
    },

    /**
     * Update account summary display
     * @param {Object} data - Account summary data
     */
    updateAccountSummary: function(data) {
        const summaryElement = document.getElementById('account-summary');

        if (!data) {
            summaryElement.innerHTML = '<div class="alert alert-warning">No account data available</div>';
            return;
        }

        summaryElement.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Account ${data.account_id}</h5>
                    <p class="text-muted">${data.account_title} (${data.account_type})</p>
                </div>
                <div class="col-md-6 text-end">
                    <h3>${formatCurrency(data.net_liquidation_value)}</h3>
                    <p class="text-muted">Net Liquidation Value</p>
                </div>
            </div>
            <hr>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Cash Balance:</strong> ${formatCurrency(data.cash_balance)}</p>
                    <p><strong>Available Funds:</strong> ${formatCurrency(data.available_funds)}</p>
                    <p><strong>Buying Power:</strong> ${formatCurrency(data.buying_power)}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Maintenance Margin:</strong> ${formatCurrency(data.maintenance_margin)}</p>
                    <p><strong>Excess Liquidity:</strong> ${formatCurrency(data.excess_liquidity)}</p>
                    <p><strong>Day Trades Remaining:</strong> ${data.day_trades_remaining}</p>
                </div>
            </div>
        `;
    },

    /**
     * Load portfolio positions
     */
    loadPositions: function() {
        document.getElementById('positions-table').querySelector('tbody').innerHTML =
            '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>';

        API.get('/api/ibkr/positions')
            .then(data => {
                this.updatePositionsTable(data);
            })
            .catch(error => {
                console.error('Error loading IBKR positions:', error);
                document.getElementById('positions-table').querySelector('tbody').innerHTML =
                    `<tr><td colspan="7" class="text-center text-danger">Error loading positions: ${error.message}</td></tr>`;
            });
    },

    /**
     * Update positions table
     * @param {Array} positions - Portfolio positions
     */
    updatePositionsTable: function(positions) {
        const tbody = document.getElementById('positions-table').querySelector('tbody');

        if (!positions || positions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No positions found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        let totalMarketValue = 0;
        let totalUnrealizedPnL = 0;

        positions.forEach(position => {
            const row = document.createElement('tr');
            const unrealizedPnLClass = position.unrealized_pnl >= 0 ? 'text-success' : 'text-danger';
            const unrealizedPnLPrefix = position.unrealized_pnl >= 0 ? '+' : '';

            row.innerHTML = `
                <td>${position.symbol}</td>
                <td>${position.position}</td>
                <td>${formatCurrency(position.average_cost)}</td>
                <td>${formatCurrency(position.market_price)}</td>
                <td>${formatCurrency(position.market_value)}</td>
                <td class="${unrealizedPnLClass}">${unrealizedPnLPrefix}${formatCurrency(position.unrealized_pnl)}</td>
                <td class="${unrealizedPnLClass}">${unrealizedPnLPrefix}${formatPercentage(position.unrealized_pnl / (position.position * position.average_cost) * 100)}</td>
            `;

            tbody.appendChild(row);

            totalMarketValue += position.market_value;
            totalUnrealizedPnL += position.unrealized_pnl;
        });

        // Add totals row
        const totalsRow = document.createElement('tr');
        totalsRow.className = 'table-light fw-bold';

        const totalPnLClass = totalUnrealizedPnL >= 0 ? 'text-success' : 'text-danger';
        const totalPnLPrefix = totalUnrealizedPnL >= 0 ? '+' : '';

        totalsRow.innerHTML = `
            <td>Total</td>
            <td></td>
            <td></td>
            <td></td>
            <td>${formatCurrency(totalMarketValue)}</td>
            <td class="${totalPnLClass}">${totalPnLPrefix}${formatCurrency(totalUnrealizedPnL)}</td>
            <td></td>
        `;

        tbody.appendChild(totalsRow);
    },

    /**
     * Load orders
     * @param {string} status - Order status filter (active, completed, canceled)
     */
    loadOrders: function(status = 'active') {
        document.getElementById('orders-table').querySelector('tbody').innerHTML =
            '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>';

        API.get('/api/ibkr/orders', { status })
            .then(data => {
                this.updateOrdersTable(data);
            })
            .catch(error => {
                console.error('Error loading IBKR orders:', error);
                document.getElementById('orders-table').querySelector('tbody').innerHTML =
                    `<tr><td colspan="7" class="text-center text-danger">Error loading orders: ${error.message}</td></tr>`;
            });
    },

    /**
     * Update orders table
     * @param {Array} orders - Orders data
     */
    updateOrdersTable: function(orders) {
        const tbody = document.getElementById('orders-table').querySelector('tbody');

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        orders.forEach(order => {
            const row = document.createElement('tr');
            const statusClass = this.getOrderStatusClass(order.status);

            row.innerHTML = `
                <td>${order.symbol}</td>
                <td>${order.action}</td>
                <td>${order.quantity}</td>
                <td>${order.order_type}</td>
                <td>${order.price ? formatCurrency(order.price) : 'Market'}</td>
                <td><span class="badge ${statusClass}">${order.status}</span></td>
                <td>${formatDate(order.submitted_time)}</td>
            `;

            tbody.appendChild(row);
        });
    },

    /**
     * Get CSS class for order status
     * @param {string} status - Order status
     * @returns {string} - CSS class
     */
    getOrderStatusClass: function(status) {
        status = status.toLowerCase();

        if (status === 'filled' || status === 'completed')
            return 'bg-success';
        else if (status === 'active' || status === 'submitted')
            return 'bg-primary';
        else if (status === 'canceled' || status === 'cancelled')
            return 'bg-secondary';
        else if (status === 'rejected')
            return 'bg-danger';
        else if (status === 'pending')
            return 'bg-warning';
        else
            return 'bg-info';
    },

    /**
     * Load trade history
     * @param {number} days - Number of days to load (default 30)
     */
    loadTradeHistory: function(days = 30) {
        document.getElementById('trades-table').querySelector('tbody').innerHTML =
            '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>';

        API.get('/api/ibkr/trades', { days })
            .then(data => {
                this.updateTradesTable(data);
            })
            .catch(error => {
                console.error('Error loading IBKR trade history:', error);
                document.getElementById('trades-table').querySelector('tbody').innerHTML =
                    `<tr><td colspan="7" class="text-center text-danger">Error loading trades: ${error.message}</td></tr>`;
            });
    },

    /**
     * Update trades table
     * @param {Array} trades - Trade history data
     */
    updateTradesTable: function(trades) {
        const tbody = document.getElementById('trades-table').querySelector('tbody');

        if (!trades || trades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No trades found</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        trades.forEach(trade => {
            const row = document.createElement('tr');
            const realizedPnLClass = trade.realized_pnl >= 0 ? 'text-success' : 'text-danger';
            const realizedPnLPrefix = trade.realized_pnl >= 0 ? '+' : '';

            row.innerHTML = `
                <td>${formatDate(trade.time)}</td>
                <td>${trade.symbol}</td>
                <td>${trade.action}</td>
                <td>${trade.quantity}</td>
                <td>${formatCurrency(trade.price)}</td>
                <td>${formatCurrency(trade.commission)}</td>
                <td class="${realizedPnLClass}">${trade.realized_pnl ? realizedPnLPrefix + formatCurrency(trade.realized_pnl) : 'N/A'}</td>
            `;

            tbody.appendChild(row);
        });
    },

    /**
     * Load account performance
     * @param {string} period - Time period (1D, 1W, 1M, 3M, 6M, 1Y, YTD)
     */
    loadPerformance: function(period = 'YTD') {
        document.getElementById('performance-card').innerHTML =
            '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';

        API.get('/api/ibkr/performance', { period })
            .then(data => {
                this.updatePerformanceData(data);
            })
            .catch(error => {
                console.error('Error loading IBKR performance data:', error);
                document.getElementById('performance-card').innerHTML =
                    `<div class="alert alert-danger">Error loading performance data: ${error.message}</div>`;
            });
    },

    /**
     * Update performance data and charts
     * @param {Object} data - Performance data
     */
    updatePerformanceData: function(data) {
        if (!data) {
            document.getElementById('performance-card').innerHTML =
                '<div class="alert alert-warning">No performance data available</div>';
            return;
        }

        // Rebuild the performance card content with a professional table and charts
        document.getElementById('performance-card').innerHTML = `
            <div class="card-header">
                <h5 class="card-title">Account Performance (${data.time_period})</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive mb-4">
                    <table class="table table-sm table-bordered table-striped performance-table">
                        <tbody>
                            <tr>
                                <th>Starting Value</th>
                                <td>${formatCurrency(data.starting_value)}</td>
                            </tr>
                            <tr>
                                <th>Ending Value</th>
                                <td>${formatCurrency(data.ending_value)}</td>
                            </tr>
                            <tr>
                                <th>Change in Value</th>
                                <td>${formatCurrency(data.change_in_value)}</td>
                            </tr>
                            <tr>
                                <th>Time-Weighted Return</th>
                                <td>${formatPercentage(data.time_weighted_return * 100)}</td>
                            </tr>
                            <tr>
                                <th>Deposits / Withdrawals</th>
                                <td>${formatCurrency(data.deposits_withdrawals)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="row mb-4">
                    <div class="col-md-6 mb-4">
                        <div class="chart-container">
                            <canvas id="account-performance-chart"></canvas>
                        </div>
                    </div>
                    <div class="col-md-6 mb-4">
                        <div class="chart-container">
                            <canvas id="returns-chart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Re-initialize charts
        this.initializeCharts();

        // Update the charts with data
        this.updatePerformanceCharts(data);
    },

    /**
     * Update performance charts
     * @param {Object} data - Performance data
     */
    updatePerformanceCharts: function(data) {
        // Update performance chart
        // This would use historical values from the performance data
        // For this example, we'll simulate some values
        const dates = this.generateDatesSeries(data.time_period);
        const performanceValues = this.simulatePerformanceValues(data.starting_value, data.ending_value, dates.length);

        this.performanceChart.data.labels = dates;
        this.performanceChart.data.datasets[0].data = performanceValues;
        this.performanceChart.update();

        // Update returns by asset class chart
        const assetClasses = Object.keys(data.returns_by_asset_class || {});
        const assetReturns = assetClasses.map(asset => data.returns_by_asset_class[asset] * 100);

        this.returnsChart.data.labels = assetClasses;
        this.returnsChart.data.datasets[0].data = assetReturns;
        this.returnsChart.update();
    },

    /**
     * Generate a series of dates for the performance chart
     * @param {string} period - Time period
     * @returns {Array} - Array of dates
     */
    generateDatesSeries: function(period) {
        const dates = [];
        const now = new Date();
        let days = 30; // Default to 1 month

        // Determine number of days based on period
        switch(period) {
            case '1D': days = 1; break;
            case '1W': days = 7; break;
            case '1M': days = 30; break;
            case '3M': days = 90; break;
            case '6M': days = 180; break;
            case '1Y': days = 365; break;
            case 'YTD':
                // Days from Jan 1 to now
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
                break;
        }

        // Generate dates
        for (let i = days; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }

        return dates;
    },

    /**
     * Simulate performance values for demo
     * @param {number} startValue - Starting value
     * @param {number} endValue - Ending value
     * @param {number} numPoints - Number of data points
     * @returns {Array} - Array of values
     */
    simulatePerformanceValues: function(startValue, endValue, numPoints) {
        const values = [];
        const totalChange = endValue - startValue;

        // Simple linear interpolation with some randomness
        for (let i = 0; i < numPoints; i++) {
            const progress = i / (numPoints - 1);
            const exactValue = startValue + (totalChange * progress);
            const randomFactor = 1 + (Math.random() * 0.04 - 0.02); // ±2% randomness
            values.push(exactValue * randomFactor);
        }

        // Ensure the last value matches the end value
        if (values.length > 0) {
            values[values.length - 1] = endValue;
        }

        return values;
    },

    /**
     * Search for symbols
     * @param {string} query - Search query
     */
    searchSymbols: function(query) {
        document.getElementById('symbol-search-results').innerHTML =
            '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>';

        API.get('/api/ibkr/search', { query })
            .then(data => {
                this.displaySearchResults(data);
            })
            .catch(error => {
                console.error('Error searching IBKR symbols:', error);
                document.getElementById('symbol-search-results').innerHTML =
                    `<div class="alert alert-danger">Error searching symbols: ${error.message}</div>`;
            });
    },

    /**
     * Display symbol search results
     * @param {Array} results - Search results
     */
    displaySearchResults: function(results) {
        const container = document.getElementById('symbol-search-results');

        if (!results || results.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">No symbols found matching your search</div>';
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Exchange</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        results.forEach(result => {
            html += `
                <tr>
                    <td>${result.symbol}</td>
                    <td>${result.name || 'N/A'}</td>
                    <td>${result.secType || 'Stock'}</td>
                    <td>${result.exchange || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary place-order-btn" 
                                data-symbol="${result.symbol}" 
                                data-contract="${result.conid || ''}">
                            Trade
                        </button>
                        <button class="btn btn-sm btn-outline-secondary get-quotes-btn" 
                                data-symbol="${result.symbol}" 
                                data-contract="${result.conid || ''}">
                            Quotes
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Add event listeners to buttons
        container.querySelectorAll('.place-order-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                const contractId = e.target.getAttribute('data-contract');
                this.openPlaceOrderModal(symbol, contractId);
            });
        });

        container.querySelectorAll('.get-quotes-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                const contractId = e.target.getAttribute('data-contract');
                this.getMarketData([contractId || symbol]);
            });
        });
    },

    /**
     * Get market data for symbols
     * @param {Array} symbols - Array of symbol IDs
     */
    getMarketData: function(symbols) {
        if (!symbols || symbols.length === 0) return;

        document.getElementById('market-data-container').innerHTML =
            '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>';

        API.get('/api/ibkr/market-data', { symbols })
            .then(data => {
                this.displayMarketData(data);
            })
            .catch(error => {
                console.error('Error fetching market data:', error);
                document.getElementById('market-data-container').innerHTML =
                    `<div class="alert alert-danger">Error fetching market data: ${error.message}</div>`;
            });
    },

    /**
     * Display market data
     * @param {Object} data - Market data
     */
    displayMarketData: function(data) {
        const container = document.getElementById('market-data-container');

        if (!data || Object.keys(data).length === 0) {
            container.innerHTML = '<div class="alert alert-warning">No market data available</div>';
            return;
        }

        let html = '<div class="row">';

        // Create a card for each symbol
        Object.keys(data).forEach(symbol => {
            const quote = data[symbol];
            const changeClass = quote.change >= 0 ? 'text-success' : 'text-danger';
            const changePrefix = quote.change >= 0 ? '+' : '';

            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card dashboard-card">
                        <div class="card-header">
                            <h5 class="card-title">${symbol}</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h3>${formatCurrency(quote.lastPrice)}</h3>
                                <span class="${changeClass}">
                                    ${changePrefix}${formatCurrency(quote.change)} (${changePrefix}${formatPercentage(quote.changePercent)})
                                </span>
                            </div>
                            <div class="row">
                                <div class="col-6">
                                    <p>Bid: ${formatCurrency(quote.bid)} x ${quote.bidSize}</p>
                                    <p>Ask: ${formatCurrency(quote.ask)} x ${quote.askSize}</p>
                                </div>
                                <div class="col-6">
                                    <p>Open: ${formatCurrency(quote.open)}</p>
                                    <p>Volume: ${formatNumber(quote.volume)}</p>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-primary mt-2 place-order-btn"
                                    data-symbol="${symbol}">
                                Place Order
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Add event listeners to place order buttons
        container.querySelectorAll('.place-order-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                this.openPlaceOrderModal(symbol);
            });
        });
    },

    /**
     * Open place order modal
     * @param {string} symbol - Symbol to trade
     * @param {string} contractId - Contract ID
     */
    openPlaceOrderModal: function(symbol = '', contractId = '') {
        // Set the symbol in the form
        document.getElementById('order-symbol').value = symbol;
        document.getElementById('order-contract-id').value = contractId;

        // Get current price if available
        if (symbol) {
            this.getMarketData([contractId || symbol]);
        }

        // Reset other form fields
        document.getElementById('order-action').value = 'BUY';
        document.getElementById('order-quantity').value = '';
        document.getElementById('order-type').value = 'MKT';
        document.getElementById('order-price').value = '';

        // Show/hide price field based on order type
        this.toggleLimitPriceField();

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('place-order-modal'));
        modal.show();
    },

    /**
     * Prepare order modal
     */
    prepareOrderModal: function() {
        // Reset form fields
        document.getElementById('order-symbol').value = '';
        document.getElementById('order-contract-id').value = '';
        document.getElementById('order-action').value = 'BUY';
        document.getElementById('order-quantity').value = '';
        document.getElementById('order-type').value = 'MKT';
        document.getElementById('order-price').value = '';

        // Add event listener for order type change
        document.getElementById('order-type').addEventListener('change', this.toggleLimitPriceField);

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('place-order-modal'));
        modal.show();
    },

    /**
     * Toggle limit price field visibility based on order type
     */
    toggleLimitPriceField: function() {
        const orderType = document.getElementById('order-type').value;
        const priceGroup = document.getElementById('limit-price-group');

        if (orderType === 'LMT' || orderType === 'STP' || orderType === 'STP_LMT') {
            priceGroup.classList.remove('d-none');
        } else {
            priceGroup.classList.add('d-none');
        }
    },

    /**
     * Submit order
     */
    submitOrder: function() {
        const orderData = {
            symbol: document.getElementById('order-symbol').value,
            contractId: document.getElementById('order-contract-id').value || undefined,
            action: document.getElementById('order-action').value,
            orderType: document.getElementById('order-type').value,
            quantity: parseFloat(document.getElementById('order-quantity').value),
            price: parseFloat(document.getElementById('order-price').value) || undefined,
            timeInForce: document.getElementById('order-time-in-force').value
        };

        // Validate order
        if (!orderData.symbol) {
            App.showNotification('Symbol is required', 'error');
            return;
        }

        if (!orderData.quantity || orderData.quantity <= 0) {
            App.showNotification('Quantity must be greater than 0', 'error');
            return;
        }

        if ((orderData.orderType === 'LMT' || orderData.orderType === 'STP' || orderData.orderType === 'STP_LMT') &&
            (!orderData.price || orderData.price <= 0)) {
            App.showNotification('Price is required for limit and stop orders', 'error');
            return;
        }

        // Show loading state
        document.getElementById('place-order-btn').disabled = true;
        document.getElementById('place-order-btn').innerHTML =
            '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';

        // Call API to place order
        API.post('/api/ibkr/orders', orderData)
            .then(data => {
                bootstrap.Modal.getInstance(document.getElementById('place-order-modal')).hide();
                App.showNotification('Order placed successfully', 'success');

                // Refresh orders
                this.loadOrders();
            })
            .catch(error => {
                console.error('Error placing order:', error);
                App.showNotification('Error placing order: ' + error.message, 'error');
            })
            .finally(() => {
                // Reset button state
                document.getElementById('place-order-btn').disabled = false;
                document.getElementById('place-order-btn').innerHTML = 'Place Order';
            });
    }
};

export default IBKRView;