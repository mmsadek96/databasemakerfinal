/**
 * Dashboard view controller
 * @module dashboard
 */

import API from './api.js';
import { formatCurrency, formatPercentage, formatNumber, formatDate } from './utils.js';
import App from './app.js';

/**
 * Dashboard view controller
 */
const DashboardView = {
    /**
     * Chart instance for quick stock chart
     */
    quickStockChart: null,

    /**
     * Initialize the dashboard view
     */
    initialize: function() {
        // Initialize chart
        this.initializeCharts();

        // Set up event listeners
        this.setupEventListeners();

        // Load initial data
        this.loadDashboardData();

        // Set up major indices buttons
        this.setupMajorIndicesButtons();
    },

    /**
     * Initialize charts in the dashboard
     */
    initializeCharts: function() {
        // Initialize quick stock chart
        const ctx = document.getElementById('quick-stock-chart').getContext('2d');
        this.quickStockChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Stock Price',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Select a symbol or index to view price chart',
                        font: {
                            size: 16
                        }
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
                            unit: 'month',
                            displayFormats: {
                                day: 'MMM d',
                                week: 'MMM d',
                                month: 'MMM yyyy'
                            }
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
                        },
                        beginAtZero: false
                    }
                }
            }
        });
    },

    /**
     * Set up event listeners for the dashboard
     */
    setupEventListeners: function() {
        // Quick chart symbol search
        document.getElementById('quick-chart-button').addEventListener('click', () => {
            const symbol = document.getElementById('quick-chart-symbol').value.trim().toUpperCase();
            if (symbol) {
                this.loadQuickStockChart(symbol);
            }
        });

        // Quick chart symbol search on Enter key
        document.getElementById('quick-chart-symbol').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('quick-chart-button').click();
            }
        });

        // Date range inputs
        document.getElementById('stock-start-date').addEventListener('change', () => {
            const symbol = document.getElementById('quick-chart-symbol').value.trim().toUpperCase();
            if (symbol) {
                this.loadQuickStockChart(symbol);
            }
        });

        document.getElementById('stock-end-date').addEventListener('change', () => {
            const symbol = document.getElementById('quick-chart-symbol').value.trim().toUpperCase();
            if (symbol) {
                this.loadQuickStockChart(symbol);
            }
        });
    },

    /**
     * Set up major indices buttons
     */
    setupMajorIndicesButtons: function() {
        document.querySelectorAll('.major-indices button').forEach(button => {
            button.addEventListener('click', () => {
                const symbol = button.getAttribute('data-symbol');
                if (symbol) {
                    // Update input field with the selected symbol
                    document.getElementById('quick-chart-symbol').value = symbol;

                    // Load the chart for this index
                    this.loadQuickStockChart(symbol);

                    // Highlight the active button
                    document.querySelectorAll('.major-indices button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    button.classList.add('active');
                }
            });
        });

        // Load SPY by default when the page loads
        setTimeout(() => {
            const spyButton = document.querySelector('.major-indices button[data-symbol="SPY"]');
            if (spyButton) {
                spyButton.click();
            }
        }, 500);
    },

    /**
     * Load dashboard data (market movers and economic snapshots)
     */
    loadDashboardData: function() {
        // Load market movers
        this.loadMarketMovers();

        // Load economic snapshots
        this.loadEconomicSnapshots();
    },

    /**
     * Load market movers data
     */
    loadMarketMovers: function() {
        API.getMarketMovers()
            .then(data => {
                this.updateMarketMoversTable('gainers-table', data.gainers);
                this.updateMarketMoversTable('losers-table', data.losers);
                this.updateMarketMoversTable('active-table', data.active);
            })
            .catch(error => {
                console.error('Error loading market movers:', error);
                document.querySelectorAll('#gainers-table tbody, #losers-table tbody, #active-table tbody').forEach(tbody => {
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading data: ${error.message}</td></tr>`;
                });
            });
    },

    /**
     * Update a market movers table with data and pagination
     * @param {string} tableId - The ID of the table to update
     * @param {Array} data - The data to populate the table with
     */
    updateMarketMoversTable: function(tableId, data) {
        const tbody = document.getElementById(tableId).querySelector('tbody');
        const paginationContainer = document.getElementById(tableId + '-pagination');

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">No data available</td></tr>`;
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        // Pagination setup
        const itemsPerPage = 10;
        const totalPages = Math.ceil(data.length / itemsPerPage);
        let currentPage = 1;

        // Function to display data for current page
        const displayPage = (page) => {
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, data.length);
            const currentPageData = data.slice(startIndex, endIndex);

            // Clear the table
            tbody.innerHTML = '';

            // Add rows for current page data
            currentPageData.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="#" class="stock-link" data-symbol="${item.ticker}">${item.ticker}</a></td>
                    <td>${formatCurrency(item.price)}</td>
                    <td class="${item.change_amount >= 0 ? 'text-success' : 'text-danger'}">
                        ${item.change_amount >= 0 ? '+' : ''}${item.change_amount.toFixed(2)}
                    </td>
                    <td class="${item.change_percentage >= 0 ? 'text-success' : 'text-danger'}">
                        ${item.change_percentage >= 0 ? '+' : ''}${item.change_percentage.toFixed(2)}%
                    </td>
                    <td>${formatNumber(item.volume)}</td>
                `;
                tbody.appendChild(row);
            });

            // Update pagination UI
            this.updatePagination(tableId, page, totalPages);

            // Add click event to stock symbols
            tbody.querySelectorAll('.stock-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const symbol = link.getAttribute('data-symbol');
                    // Navigate to stocks view and load the selected stock
                    document.getElementById('nav-stocks').click();
                    document.getElementById('stock-symbol-input').value = symbol;
                    document.getElementById('stock-search-button').click();
                });
            });
        };

        // Initial display
        displayPage(1);
    },

    /**
     * Update pagination controls
     * @param {string} tableId - Table ID
     * @param {number} currentPage - Current page number
     * @param {number} totalPages - Total number of pages
     */
    updatePagination: function(tableId, currentPage, totalPages) {
        const paginationContainer = document.getElementById(tableId + '-pagination');
        if (!paginationContainer) return;

        let paginationHTML = `
            <nav aria-label="Page navigation">
                <ul class="pagination pagination-sm justify-content-center mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="prev" aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
        `;

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        paginationHTML += `
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="next" aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </ul>
            </nav>
        `;

        paginationContainer.innerHTML = paginationHTML;

        // Add event listeners to pagination controls
        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');

                let newPage;
                if (page === 'prev') {
                    newPage = Math.max(1, currentPage - 1);
                } else if (page === 'next') {
                    newPage = Math.min(totalPages, currentPage + 1);
                } else {
                    newPage = parseInt(page);
                }

                if (newPage !== currentPage) {
                    this.updateMarketMoversTable(tableId, this.getTableData(tableId));
                }
            });
        });
    },

    /**
     * Get data for a specific table
     * @param {string} tableId - Table ID
     * @returns {Array} - Table data
     */
    getTableData: function(tableId) {
        // This is a helper method to get the cached data for a table
        // In a real implementation, we would maintain a cache of the data
        // For this example, we'll simulate by re-fetching from API

        return [];  // Placeholder
    },

    /**
     * Load economic indicator snapshots
     */
    loadEconomicSnapshots: function() {
        // Load latest inflation data
        this.loadIndicatorSnapshot('Inflation', 'econ-inflation');

        // Load latest unemployment data
        this.loadIndicatorSnapshot('Unemployment', 'econ-unemployment');

        // Load latest GDP data
        this.loadIndicatorSnapshot('Real GDP', 'econ-gdp');

        // Load latest Treasury Yield data
        this.loadIndicatorSnapshot('Treasury Yield', 'econ-treasury');
    },

    /**
     * Load a single economic indicator snapshot
     * @param {string} indicator - Indicator name
     * @param {string} elementId - Element ID to update
     */
    loadIndicatorSnapshot: function(indicator, elementId) {
        API.getIndicatorData(indicator, null, null)
            .then(data => {
                if (data.length > 0) {
                    // Sort by date (newest first)
                    data.sort((a, b) => new Date(b.date) - new Date(a.date));

                    const latestData = data[0];
                    const element = document.getElementById(elementId);
                    const badge = element.querySelector('.badge');

                    badge.textContent = this.formatIndicatorValue(indicator, latestData.value);
                    badge.classList.remove('bg-primary');

                    // Color-code based on the indicator
                    if (indicator === 'Inflation' || indicator === 'Unemployment') {
                        const value = parseFloat(latestData.value);
                        badge.classList.add(value > 4 ? 'bg-danger' : (value > 2 ? 'bg-warning' : 'bg-success'));
                    } else if (indicator === 'Real GDP') {
                        const value = parseFloat(latestData.value);
                        badge.classList.add(value < 0 ? 'bg-danger' : (value < 2 ? 'bg-warning' : 'bg-success'));
                    } else {
                        badge.classList.add('bg-info');
                    }

                    // Add click event to navigate to the indicator view
                    element.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.getElementById('nav-indicators').click();
                        document.getElementById('indicator-select').value = indicator;
                        document.getElementById('load-indicator-button').click();
                    });
                }
            })
            .catch(error => {
                console.error(`Error loading ${indicator} snapshot:`, error);
                const element = document.getElementById(elementId);
                const badge = element.querySelector('.badge');
                badge.textContent = 'N/A';
                badge.classList.remove('bg-primary');
                badge.classList.add('bg-secondary');
            });
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
    },

    /**
     * Load quick stock chart
     * @param {string} symbol - Stock symbol
     */
    loadQuickStockChart: function(symbol) {
        // Show loading state on chart
        this.quickStockChart.data.datasets[0].data = [];
        this.quickStockChart.options.plugins.title.text = `Loading ${symbol} data...`;
        this.quickStockChart.update();

        const startDate = document.getElementById('stock-start-date').value;
        const endDate = document.getElementById('stock-end-date').value;

        API.getStockData(symbol, startDate, endDate)
            .then(data => {
                if (data.length === 0) {
                    throw new Error('No data available for the selected date range');
                }

                // Process the data for chart display
                this.updateChartWithData(symbol, data);
            })
            .catch(error => {
                console.error('Error loading quick stock chart:', error);
                // Display error message on chart
                this.quickStockChart.data.datasets[0].data = [];
                this.quickStockChart.options.plugins.title.text = `Error: ${error.message}`;
                this.quickStockChart.update();
            });
    },

    /**
     * Update chart with processed data
     * @param {string} symbol - Stock symbol
     * @param {Array} data - Stock data
     */
    updateChartWithData: function(symbol, data) {
        // Ensure data is sorted by date (oldest first)
        data.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Filter data to match the selected date range
        const startDate = new Date(document.getElementById('stock-start-date').value);
        const endDate = new Date(document.getElementById('stock-end-date').value);

        const filteredData = data.filter(d => {
            const date = new Date(d.date);
            return date >= startDate && date <= endDate;
        });

        if (filteredData.length === 0) {
            throw new Error('No data available for the selected date range');
        }

        // Format data for Chart.js
        const chartData = filteredData.map(d => {
            return {
                x: new Date(d.date),
                y: d.adjusted_close
            };
        });

        // Determine appropriate time unit based on date range
        const firstDate = chartData[0].x;
        const lastDate = chartData[chartData.length - 1].x;
        const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

        let timeUnit = 'day';
        if (daysDiff > 365) {
            timeUnit = 'month';
        } else if (daysDiff > 60) {
            timeUnit = 'week';
        }

        // Update chart with the parsed data
        this.quickStockChart.options.scales.x.time.unit = timeUnit;
        this.quickStockChart.data.datasets[0].data = chartData;
        this.quickStockChart.data.datasets[0].label = `${symbol} Price`;
        this.quickStockChart.options.plugins.title.text = `${symbol} Stock Price`;
        this.quickStockChart.update();
    }
};

export default DashboardView;