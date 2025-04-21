/**
 * Stocks view controller
 * @module stocks
 */

import API from './api.js';
import { formatCurrency, formatPercentage, formatNumber, calculateSMA } from './utils.js';
import App from './app.js';

/**
 * Stocks view controller
 */
const StocksView = {
    /**
     * Chart instance for stock price chart
     */
    stockPriceChart: null,

    /**
     * Current active indicators
     */
    activeIndicators: [],

    /**
     * Available technical indicators
     */
    availableIndicators: {},

    /**
     * Initialize the stocks view
     */
    initialize: function() {
        // Set up event listeners
        this.setupEventListeners();

        // Initialize charts
        this.initializeCharts();

        // Load available technical indicators
        this.loadAvailableIndicators();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Stock search button
        document.getElementById('stock-search-button').addEventListener('click', () => {
            const symbol = document.getElementById('stock-symbol-input').value.trim().toUpperCase();
            if (symbol) {
                this.loadStockData(symbol);
            }
        });

        // Stock search input on Enter key
        document.getElementById('stock-symbol-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('stock-search-button').click();
            }
        });

        // Date range inputs
        document.getElementById('stock-start-date').addEventListener('change', () => {
            const symbol = document.getElementById('stock-symbol-input').value.trim().toUpperCase();
            if (symbol) {
                this.loadStockData(symbol);
            }
        });

        document.getElementById('stock-end-date').addEventListener('change', () => {
            const symbol = document.getElementById('stock-symbol-input').value.trim().toUpperCase();
            if (symbol) {
                this.loadStockData(symbol);
            }
        });

        // Chart type selection
        document.getElementById('chart-line').addEventListener('change', () => {
            if (document.getElementById('chart-line').checked) {
                this.updateChartType('line');
            }
        });

        document.getElementById('chart-candlestick').addEventListener('change', () => {
            if (document.getElementById('chart-candlestick').checked) {
                this.updateChartType('candlestick');
            }
        });

        // Add indicator button
        document.getElementById('add-indicator-button').addEventListener('click', () => {
            const symbol = document.getElementById('stock-symbol-input').value.trim().toUpperCase();
            if (!symbol) {
                App.showNotification('Please enter a stock symbol first', 'warning');
                return;
            }

            const indicatorSelect = document.getElementById('technical-indicators-dropdown');
            const indicator = indicatorSelect.value;

            if (!indicator) {
                App.showNotification('Please select an indicator', 'warning');
                return;
            }

            // Get time period from input
            const timePeriod = parseInt(document.getElementById('indicator-time-period').value) || 14;

            // Add indicator to chart
            this.addTechnicalIndicator(symbol, indicator, {
                time_period: timePeriod
            });
        });

        // Reset indicators button
        document.getElementById('reset-indicators-button').addEventListener('click', () => {
            this.resetIndicators();
        });
    },

    /**
     * Initialize charts
     */
    initializeCharts: function() {
        const ctx = document.getElementById('stock-price-chart').getContext('2d');
        this.stockPriceChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Stock Price',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Enter a symbol to view price chart'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Price: ${formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price ($)'
                        }
                    }
                }
            }
        });
    },

    /**
     * Load available technical indicators
     */
    loadAvailableIndicators: function() {
        API.getAvailableTechnicalIndicators()
            .then(data => {
                this.availableIndicators = data.indicators || {};

                // Populate the indicators dropdown
                this.populateIndicatorsDropdown();
            })
            .catch(error => {
                console.error('Error loading technical indicators:', error);
            });
    },

    /**
     * Populate the indicators dropdown
     */
    populateIndicatorsDropdown: function() {
        const dropdown = document.getElementById('technical-indicators-dropdown');
        if (!dropdown) return;

        // Clear existing options
        dropdown.innerHTML = '<option value="" selected disabled>Select Indicator</option>';

        // Add options for each indicator
        Object.entries(this.availableIndicators).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${code} - ${name}`;
            dropdown.appendChild(option);
        });
    },

    /**
     * Load stock data
     * @param {string} symbol - Stock symbol
     */
    loadStockData: function(symbol) {
        // Reset indicators when loading new stock data
        this.resetIndicators();

        const startDate = document.getElementById('stock-start-date').value;
        const endDate = document.getElementById('stock-end-date').value;

        // Show loading state
        document.getElementById('stock-details').innerHTML =
            '<p class="text-center"><i class="bi bi-hourglass-split"></i> Loading...</p>';

        API.getStockData(symbol, startDate, endDate)
            .then(data => {
                if (data.length === 0) {
                    throw new Error('No data available for the selected date range');
                }

                // Update stock details
                this.updateStockDetails(symbol, data);

                // Update chart
                this.updateStockChart(symbol, data);
            })
            .catch(error => {
                console.error('Error loading stock data:', error);
                document.getElementById('stock-details').innerHTML =
                    `<div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${error.message}
                    </div>`;
                // Destroy chart if exists
                if (this.stockPriceChart) {
                    this.stockPriceChart.destroy();
                    this.stockPriceChart = null;
                }
            });
    },

    /**
     * Update stock details panel
     * @param {string} symbol - Stock symbol
     * @param {Array} data - Stock data
     */
    updateStockDetails: function(symbol, data) {
        // Sort data by date (newest first)
        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        const latestData = data[0];
        const previousData = data[1] || data[0];

        // Calculate daily change
        const priceChange = latestData.close - previousData.close;
        const percentChange = (priceChange / previousData.close) * 100;

        // Calculate 52-week high and low
        const yearData = data.slice(0, Math.min(252, data.length)); // Approximately 252 trading days in a year
        const high52Week = Math.max(...yearData.map(d => d.high));
        const low52Week = Math.min(...yearData.map(d => d.low));

        // Calculate average volume
        const avgVolume = Math.round(
            yearData.reduce((sum, d) => sum + d.volume, 0) / yearData.length
        );

        // Calculate simple moving averages
        const sma50 = calculateSMA(data, 'close', 50);
        const sma200 = calculateSMA(data, 'close', 200);

        // Update details panel
        document.getElementById('stock-details').innerHTML = `
            <h3>${symbol}</h3>
            <div class="price-container mb-3">
                <span class="current-price">${formatCurrency(latestData.close)}</span>
                <span class="price-change ${priceChange >= 0 ? 'text-success' : 'text-danger'}">
                    ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} (${percentChange.toFixed(2)}%)
                </span>
            </div>
            <div class="mb-3">
                <small class="text-muted">Last updated: ${latestData.date}</small>
            </div>
            <div class="row">
                <div class="col-6">
                    <p><strong>Open:</strong> ${formatCurrency(latestData.open)}</p>
                    <p><strong>High:</strong> ${formatCurrency(latestData.high)}</p>
                    <p><strong>Low:</strong> ${formatCurrency(latestData.low)}</p>
                    <p><strong>Volume:</strong> ${formatNumber(latestData.volume)}</p>
                </div>
                <div class="col-6">
                    <p><strong>52W High:</strong> ${formatCurrency(high52Week)}</p>
                    <p><strong>52W Low:</strong> ${formatCurrency(low52Week)}</p>
                    <p><strong>Avg Volume:</strong> ${formatNumber(avgVolume)}</p>
                    <p><strong>SMA 50:</strong> ${formatCurrency(sma50)}</p>
                    <p><strong>SMA 200:</strong> ${formatCurrency(sma200)}</p>
                </div>
            </div>
        `;
    },

    /**
     * Update stock chart
     * @param {string} symbol - Stock symbol
     * @param {Array} data - Stock data
     */
    updateStockChart: function(symbol, data) {
        // Prepare data sorted by date (oldest first)
        data.sort((a, b) => new Date(a.date) - new Date(b.date));
        // Determine chart type
        const isLine = document.getElementById('chart-line').checked;
        // Get canvas context
        const canvas = document.getElementById('stock-price-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        // Destroy existing chart if present
        if (this.stockPriceChart) {
            this.stockPriceChart.destroy();
        }
        // Build config for line or candlestick
        if (isLine) {
            const chartData = data.map(d => ({ x: new Date(d.date), y: d.adjusted_close }));
            this.stockPriceChart = new Chart(ctx, {
                type: 'line',
                data: { datasets: [{ label: `${symbol} Stock Price`, data: chartData, borderColor: 'rgb(75,192,192)', backgroundColor: 'rgba(75,192,192,0.2)', tension: 0.1 }] },
                options: {
                    responsive: true,
                    plugins: { title: { display: true, text: `${symbol} Stock Price` }, tooltip: { callbacks: { label: ctx => `Price: ${formatCurrency(ctx.parsed.y)}` } } },
                    scales: { x: { type: 'time', time: { unit: 'month' }, title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Price ($)' } } }
                }
            });
        } else {
            const chartData = data.map(d => ({ x: new Date(d.date), o: d.open, h: d.high, l: d.low, c: d.close }));
            this.stockPriceChart = new Chart(ctx, {
                type: 'candlestick',
                data: { datasets: [{ label: `${symbol} OHLC`, data: chartData }] },
                options: {
                    responsive: true,
                    plugins: { title: { display: true, text: `${symbol} OHLC` }, tooltip: { callbacks: { label: ctx => { const d = ctx.raw; return [`Open: ${formatCurrency(d.o)}`, `High: ${formatCurrency(d.h)}`, `Low: ${formatCurrency(d.l)}`, `Close: ${formatCurrency(d.c)}`]; } } } },
                    scales: { x: { type: 'time', time: { unit: 'month' }, title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Price ($)' } } }
                }
            });
        }
    },

    /**
     * Update chart type
     * @param {string} type - Chart type ('line' or 'candlestick')
     */
    updateChartType: function(type) {
        const symbol = document.getElementById('stock-symbol-input').value.trim().toUpperCase();
        if (symbol) {
            this.loadStockData(symbol);
        }
    },

    /**
     * Add technical indicator to chart
     * @param {string} symbol - Stock symbol
     * @param {string} indicator - Technical indicator
     * @param {Object} params - Indicator parameters
     */
    addTechnicalIndicator: function(symbol, indicator, params = {}) {
        const startDate = document.getElementById('stock-start-date').value;
        const endDate = document.getElementById('stock-end-date').value;

        // Show loading notification
        App.showNotification(`Loading ${indicator} indicator...`, 'info');

        // Get indicator data
        API.getTechnicalIndicator(symbol, indicator, {
            ...params,
            start_date: startDate,
            end_date: endDate
        })
        .then(data => {
            if (data.length === 0) {
                App.showNotification(`No ${indicator} data available for the selected date range`, 'warning');
                return;
            }

            // Add indicator to the active indicators list
            this.activeIndicators.push({
                name: indicator,
                data: data,
                params: params
            });

            // Update chart with indicator
            this.updateChartWithIndicator(symbol, indicator, data);

            // Add indicator to the active indicators list in the UI
            this.updateActiveIndicatorsList();
        })
        .catch(error => {
            console.error(`Error loading ${indicator} indicator:`, error);
            App.showNotification(`Error loading ${indicator} indicator: ${error.message}`, 'error');
        });
    },

    /**
     * Update chart with technical indicator
     * @param {string} symbol - Stock symbol
     * @param {string} indicator - Technical indicator
     * @param {Array} data - Indicator data
     */
    updateChartWithIndicator: function(symbol, indicator, data) {
        // Get current chart type
        const chartType = document.getElementById('chart-line').checked ? 'line' : 'candlestick';

        // Check if the chart is initialized
        if (!this.stockPriceChart) {
            App.showNotification('Chart not initialized', 'error');
            return;
        }

        // Prepare data for chart
        const chartData = [];
        const indicatorKeys = Object.keys(data[0]).filter(key => key !== 'date');

        // Format data for Chart.js
        data.forEach(d => {
            const date = new Date(d.date);
            indicatorKeys.forEach(key => {
                chartData.push({
                    x: date,
                    y: d[key],
                    indicator: key
                });
            });
        });

        // Generate random colors for indicators
        const colors = this.generateIndicatorColors(indicatorKeys.length);

        // Create datasets for each indicator value
        indicatorKeys.forEach((key, i) => {
            // Filter data for this specific indicator value
            const dataForKey = chartData.filter(d => d.indicator === key);

            // Create a new dataset for this indicator
            const dataset = {
                label: `${indicator} (${key})`,
                data: dataForKey,
                borderColor: colors[i],
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                tension: 0.4,
                yAxisID: 'y-indicator' // Use a separate y-axis for indicators
            };

            // Special case for Bollinger Bands
            if (indicator === 'BBANDS') {
                if (key.includes('LOWER')) {
                    dataset.borderDash = [5, 5];
                } else if (key.includes('UPPER')) {
                    dataset.borderDash = [5, 5];
                }
            }

            // Add dataset to chart
            this.stockPriceChart.data.datasets.push(dataset);
        });

        // Check if we need to add a new y-axis for indicators
        if (!this.stockPriceChart.options.scales['y-indicator']) {
            this.stockPriceChart.options.scales['y-indicator'] = {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Indicator Value'
                },
                grid: {
                    drawOnChartArea: false
                }
            };
        }

        // Update the chart
        this.stockPriceChart.update();
    },

    /**
     * Generate random colors for indicators
     * @param {number} count - Number of colors to generate
     * @returns {Array} - Array of color strings
     */
    generateIndicatorColors: function(count) {
        const colors = [];
        const baseColors = [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)',
            'rgb(255, 99, 255)',
            'rgb(99, 255, 132)',
            'rgb(99, 132, 255)'
        ];

        // Use base colors first, then generate random colors if needed
        for (let i = 0; i < count; i++) {
            if (i < baseColors.length) {
                colors.push(baseColors[i]);
            } else {
                const r = Math.floor(Math.random() * 200) + 55;
                const g = Math.floor(Math.random() * 200) + 55;
                const b = Math.floor(Math.random() * 200) + 55;
                colors.push(`rgb(${r}, ${g}, ${b})`);
            }
        }

        return colors;
    },

    /**
     * Update active indicators list in the UI
     */
    updateActiveIndicatorsList: function() {
        const container = document.getElementById('active-indicators-list');
        if (!container) return;

        // Clear existing list
        container.innerHTML = '';

        // Add each active indicator to the list
        this.activeIndicators.forEach((indicator, index) => {
            const listItem = document.createElement('div');
            listItem.className = 'active-indicator-item';
            listItem.innerHTML = `
                <span>${indicator.name}</span>
                <button class="btn btn-sm btn-outline-danger remove-indicator" data-index="${index}">
                    <i class="bi bi-x"></i>
                </button>
            `;
            container.appendChild(listItem);
        });

        // Add event listeners to remove buttons
        container.querySelectorAll('.remove-indicator').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.removeIndicator(index);
            });
        });
    },

    /**
     * Remove indicator from chart
     * @param {number} index - Indicator index
     */
    removeIndicator: function(index) {
        // Get indicator to remove
        const indicator = this.activeIndicators[index];
        if (!indicator) return;

        // Remove indicator from active list
        this.activeIndicators.splice(index, 1);

        // Remove indicator datasets from chart
        const indicatorLabel = indicator.name;
        const datasetsToRemove = [];

        this.stockPriceChart.data.datasets.forEach((dataset, i) => {
            if (dataset.label.startsWith(indicatorLabel)) {
                datasetsToRemove.push(i);
            }
        });

        // Remove datasets in reverse order to avoid index issues
        datasetsToRemove.reverse().forEach(i => {
            this.stockPriceChart.data.datasets.splice(i, 1);
        });

        // If no indicators left, remove the secondary y-axis
        if (this.activeIndicators.length === 0 && this.stockPriceChart.options.scales['y-indicator']) {
            delete this.stockPriceChart.options.scales['y-indicator'];
        }

        // Update chart
        this.stockPriceChart.update();

        // Update active indicators list in UI
        this.updateActiveIndicatorsList();

        // Show notification
        App.showNotification(`Removed ${indicatorLabel} indicator`, 'info');
    },

    /**
     * Reset all indicators
     */
    resetIndicators: function() {
        // Clear active indicators list
        this.activeIndicators = [];

        // Reset the chart to only include price data
        const priceDataset = this.stockPriceChart.data.datasets.find(d => d.label.includes('Price'));
        if (priceDataset) {
            this.stockPriceChart.data.datasets = [priceDataset];
        } else {
            this.stockPriceChart.data.datasets = [];
        }

        // Remove secondary y-axis
        if (this.stockPriceChart.options.scales['y-indicator']) {
            delete this.stockPriceChart.options.scales['y-indicator'];
        }

        // Update chart
        this.stockPriceChart.update();

        // Update active indicators list in UI
        this.updateActiveIndicatorsList();

        // Show notification
        App.showNotification('Cleared all indicators', 'info');
    }
};

export default StocksView;