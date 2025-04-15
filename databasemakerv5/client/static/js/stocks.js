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
     * Initialize the stocks view
     */
    initialize: function() {
        // Set up event listeners
        this.setupEventListeners();

        // Initialize charts
        this.initializeCharts();
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
     * Load stock data
     * @param {string} symbol - Stock symbol
     */
    loadStockData: function(symbol) {
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

                // Clear chart
                this.stockPriceChart.data.datasets[0].data = [];
                this.stockPriceChart.options.plugins.title.text = `Error: ${error.message}`;
                this.stockPriceChart.update();
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
        // Sort data by date (oldest first for charting)
        data.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Get current chart type
        const chartType = document.getElementById('chart-line').checked ? 'line' : 'candlestick';

        if (chartType === 'line') {
            // Format data for line chart
            const chartData = data.map(d => ({
                x: new Date(d.date),
                y: d.adjusted_close
            }));

            // Update chart
            this.stockPriceChart.data.datasets[0].data = chartData;
            this.stockPriceChart.data.datasets[0].label = `${symbol} Price`;
            this.stockPriceChart.options.plugins.title.text = `${symbol} Stock Price`;
            this.stockPriceChart.update();
        } else {
            // Format data for candlestick chart
            const chartData = data.map(d => ({
                x: new Date(d.date),
                o: d.open,
                h: d.high,
                l: d.low,
                c: d.close
            }));

            // Destroy existing chart and create a new candlestick chart
            this.stockPriceChart.destroy();

            const ctx = document.getElementById('stock-price-chart').getContext('2d');
            this.stockPriceChart = new Chart(ctx, {
                type: 'candlestick',
                data: {
                    datasets: [{
                        label: `${symbol} OHLC`,
                        data: chartData
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `${symbol} Stock Price`
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const d = context.raw;
                                    return [
                                        `Open: ${formatCurrency(d.o)}`,
                                        `High: ${formatCurrency(d.h)}`,
                                        `Low: ${formatCurrency(d.l)}`,
                                        `Close: ${formatCurrency(d.c)}`
                                    ];
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
    }
};

export default StocksView;