/**
 * Economic indicators view controller
 * @module indicators
 */

import API from './api.js';
import { formatPercentage } from './utils.js';
import App from './app.js';

/**
 * Economic indicators view controller
 */
const IndicatorsView = {
    /**
     * Chart instance for indicator chart
     */
    indicatorChart: null,

    /**
     * Initialize the indicators view
     */
    initialize: function() {
        // Set up event listeners
        this.setupEventListeners();

        // Initialize chart
        this.initializeChart();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Load indicator button
        document.getElementById('load-indicator-button').addEventListener('click', () => {
            const indicator = document.getElementById('indicator-select').value;
            if (indicator) {
                this.loadIndicatorData(indicator);
            }
        });

        // Date range inputs
        document.getElementById('indicator-start-date').addEventListener('change', () => {
            const indicator = document.getElementById('indicator-select').value;
            if (indicator) {
                this.loadIndicatorData(indicator);
            }
        });

        document.getElementById('indicator-end-date').addEventListener('change', () => {
            const indicator = document.getElementById('indicator-select').value;
            if (indicator) {
                this.loadIndicatorData(indicator);
            }
        });
    },

    /**
     * Initialize indicator chart
     */
    initializeChart: function() {
        const ctx = document.getElementById('indicator-chart').getContext('2d');
        this.indicatorChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Indicator Value',
                    data: [],
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Select an indicator to view data'
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'year'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                }
            }
        });
    },

    /**
     * Load indicator data
     * @param {string} indicator - Indicator name
     */
    loadIndicatorData: function(indicator) {
        const startDate = document.getElementById('indicator-start-date').value;
        const endDate = document.getElementById('indicator-end-date').value;

        // Show loading state
        document.getElementById('indicator-details').innerHTML =
            '<p class="text-center"><i class="bi bi-hourglass-split"></i> Loading...</p>';

        API.getIndicatorData(indicator, startDate, endDate)
            .then(data => {
                if (data.length === 0) {
                    throw new Error('No data available for the selected date range');
                }

                // Update indicator details
                this.updateIndicatorDetails(indicator, data);

                // Update chart
                this.updateIndicatorChart(indicator, data);
            })
            .catch(error => {
                console.error('Error loading indicator data:', error);
                document.getElementById('indicator-details').innerHTML =
                    `<div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${error.message}
                    </div>`;

                // Clear chart
                this.indicatorChart.data.datasets[0].data = [];
                this.indicatorChart.options.plugins.title.text = `Error: ${error.message}`;
                this.indicatorChart.update();
            });
    },

    /**
     * Update indicator details panel
     * @param {string} indicator - Indicator name
     * @param {Array} data - Indicator data
     */
    updateIndicatorDetails: function(indicator, data) {
        // Sort data by date (newest first)
        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        const latestData = data[0];
        const previousData = data[1] || data[0];

        // Calculate change
        const valueChange = latestData.value - previousData.value;
        const percentChange = (valueChange / Math.abs(previousData.value)) * 100;

        // Calculate min, max, and average values
        const minValue = Math.min(...data.map(d => d.value));
        const maxValue = Math.max(...data.map(d => d.value));
        const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;

        // Get description for the indicator
        const descriptions = {
            'Inflation': 'Annual inflation rate in the U.S.',
            'Unemployment': 'Unemployment rate in the U.S.',
            'CPI': 'Consumer Price Index, a measure of the average change over time in the prices paid by consumers for goods and services.',
            'Real GDP': 'Real Gross Domestic Product, a measure of economic output adjusted for inflation.',
            'Real GDP per Capita': 'Real GDP divided by the population, a measure of the standard of living.',
            'Treasury Yield': '10-Year U.S. Treasury bond yield, an important indicator for interest rates and economic expectations.',
            'Federal Funds Rate': 'The interest rate at which depository institutions lend reserve balances to other depository institutions overnight.',
            'Retail Sales': 'A measure of retail store sales in the U.S.',
            'Durables': 'New orders for manufactured durable goods, a leading indicator of manufacturing activity.',
            'Nonfarm Payroll': 'Total number of U.S. workers in the economy excluding farm workers and some other job classifications.'
        };

        // Format indicator value
        const formattedValue = this.formatIndicatorValue(indicator, latestData.value);

        // Update details panel
        document.getElementById('indicator-details').innerHTML = `
            <h3>${indicator}</h3>
            <p class="text-muted">${descriptions[indicator] || ''}</p>
            <div class="value-container mb-3">
                <span class="current-value">${formattedValue}</span>
                <span class="value-change ${valueChange >= 0 ? 'text-success' : 'text-danger'}">
                    ${valueChange >= 0 ? '+' : ''}${valueChange.toFixed(2)} (${percentChange.toFixed(2)}%)
                </span>
            </div>
            <div class="mb-3">
                <small class="text-muted">Last updated: ${latestData.date}</small>
            </div>
            <div class="row">
                <div class="col-12">
                    <p><strong>Min Value:</strong> ${this.formatIndicatorValue(indicator, minValue)}</p>
                    <p><strong>Max Value:</strong> ${this.formatIndicatorValue(indicator, maxValue)}</p>
                    <p><strong>Avg Value:</strong> ${this.formatIndicatorValue(indicator, avgValue)}</p>
                    <p><strong>Data Points:</strong> ${data.length}</p>
                </div>
            </div>
        `;
    },

    /**
     * Update indicator chart
     * @param {string} indicator - Indicator name
     * @param {Array} data - Indicator data
     */
    updateIndicatorChart: function(indicator, data) {
        // Sort data by date (oldest first for charting)
        data.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Format data for chart
        const chartData = data.map(d => ({
            x: new Date(d.date),
            y: d.value
        }));

        // Determine appropriate time unit based on data frequency
        let timeUnit = 'year';
        if (data.length > 0) {
            const intervals = {
                'Real GDP': 'quarter',
                'Real GDP per Capita': 'year',
                'Treasury Yield': 'month',
                'Federal Funds Rate': 'month',
                'CPI': 'month',
                'Inflation': 'month',
                'Retail Sales': 'month',
                'Durables': 'month',
                'Unemployment': 'month',
                'Nonfarm Payroll': 'month'
            };
            timeUnit = intervals[indicator] || 'month';
        }

        // Update chart
        this.indicatorChart.data.datasets[0].data = chartData;
        this.indicatorChart.data.datasets[0].label = indicator;
        this.indicatorChart.options.plugins.title.text = `${indicator} Over Time`;
        this.indicatorChart.options.scales.x.time.unit = timeUnit;

        // Customize Y-axis format based on indicator
        this.indicatorChart.options.scales.y.ticks = {
            callback: (value) => {
                return this.formatIndicatorValue(indicator, value);
            }
        };

        this.indicatorChart.update();
    },

    /**
     * Format indicator value based on its type
     * @param {string} indicator - Indicator name
     * @param {number} value - Value to format
     * @returns {string} - Formatted value
     */
    formatIndicatorValue: function(indicator, value) {
        value = parseFloat(value);

        switch (indicator) {
            case 'Inflation':
            case 'Unemployment':
            case 'Real GDP':
            case 'Real GDP per Capita':
                return `${value.toFixed(1)}%`;
            case 'Treasury Yield':
            case 'Federal Funds Rate':
                return `${value.toFixed(2)}%`;
            case 'CPI':
                return value.toFixed(1);
            case 'Retail Sales':
            case 'Durables':
            case 'Nonfarm Payroll':
                return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
            default:
                return value.toString();
        }
    }
};

export default IndicatorsView;