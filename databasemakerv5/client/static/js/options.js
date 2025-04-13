/**
 * Main Options Module - Options Data View Controller
 * Coordinates all sub-modules for options analysis
 * @module options
 */

import API from './api.js';
import App from './app.js';
import { OptionsChainModule } from './modules/options/options-chain.js';
import { OptionsAnalyticsModule } from './modules/options/options-analytics.js';
import { OptionsChartsModule } from './modules/options/options-charts.js';
import { OptionsStrategiesModule } from './modules/options/options-strategies.js';
import { OptionsDetailModule } from './modules/options/options-detail.js';

/**
 * Options data view controller
 */
class OptionsView {
    /**
     * Constructor
     */
    constructor() {
        // Current data state
        this.currentOptionsData = null;
        this.currentSymbol = null;
        this.stockData = null;

        // Sub-modules
        this.chainModule = null;
        this.analyticsModule = null;
        this.chartsModule = null;
        this.strategiesModule = null;
        this.detailModule = null;
    }

    /**
     * Initialize the options view
     */
    initialize() {
        console.log("Initializing Options View");

        // Initialize sub-modules
        this.chainModule = new OptionsChainModule(this);
        this.analyticsModule = new OptionsAnalyticsModule(this);
        this.chartsModule = new OptionsChartsModule(this);
        this.strategiesModule = new OptionsStrategiesModule(this);
        this.detailModule = new OptionsDetailModule(this);

        // Initialize each module
        this.chainModule.initialize();
        this.analyticsModule.initialize();
        this.chartsModule.initialize();
        this.strategiesModule.initialize();
        this.detailModule.initialize();

        // Set up event listeners
        this.setupEventListeners();
    }

    // [Rest of the OptionsView class code remains the same]

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Load options data button
        document.getElementById('load-options-button').addEventListener('click', () => {
            const symbol = document.getElementById('options-symbol').value.trim().toUpperCase();
            const includeGreeks = document.getElementById('include-greeks').checked;

            if (symbol) {
                this.loadOptionsData(symbol, includeGreeks);
                this.loadUnderlyingData(symbol);
            }
        });

        // Options symbol on Enter key
        document.getElementById('options-symbol').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('load-options-button').click();
            }
        });

        // Toggle advanced button handling - use global event delegation
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'toggle-advanced') {
                console.log("Toggle advanced button clicked");
                const advancedSection = document.getElementById('advanced-analysis');
                if (advancedSection) {
                    advancedSection.classList.toggle('d-none');
                    console.log("Advanced analysis section toggled:",
                        !advancedSection.classList.contains('d-none') ? "shown" : "hidden");

                    if (advancedSection.classList.contains('d-none')) {
                        e.target.textContent = 'Show Advanced Analysis';
                    } else {
                        e.target.textContent = 'Hide Advanced Analysis';
                        // Update charts when section becomes visible
                        this.chartsModule.updateAllCharts();
                    }
                } else {
                    console.error("Could not find advanced-analysis element!");
                }
            }
        });
    }

    /**
     * Load options data for a symbol
     * @param {string} symbol - Stock symbol
     * @param {boolean} includeGreeks - Whether to include Greeks
     */
    loadOptionsData(symbol, includeGreeks) {
        // Show loading state
        document.getElementById('all-options').innerHTML =
            '<p class="text-center"><i class="bi bi-hourglass-split"></i> Loading options data...</p>';

        // Reset current data
        this.currentOptionsData = null;
        this.currentSymbol = symbol;

        // Initialize UI components
        this.initializeUIComponents();

        API.getOptionsData(symbol, includeGreeks)
            .then(data => {
                if (!data || data.length === 0) {
                    throw new Error('No options data available for this symbol');
                }

                // Store the data for further analysis
                this.currentOptionsData = data;

                // Process and display options data through the chain module
                this.chainModule.displayOptionsData(data, symbol, includeGreeks);

                // Update analytics
                this.analyticsModule.updateOptionsAnalytics(data, symbol);

                // Update implied move analysis if stock data is available
                if (this.stockData) {
                    this.analyticsModule.updateImpliedMoveAnalysis();
                }
            })
            .catch(error => {
                console.error('Error loading options data:', error);
                document.getElementById('all-options').innerHTML =
                    `<div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${error.message}
                    </div>`;

                // Reset tabs
                document.getElementById('options-tabs').innerHTML = `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="all-tab" data-bs-toggle="tab" data-bs-target="#all-options" type="button" role="tab">All Expirations</button>
                    </li>
                `;

                // Re-initialize UI components
                this.initializeUIComponents();
            });
    }

    /**
     * Load underlying stock data for the current symbol
     * @param {string} symbol - Stock symbol
     */
    loadUnderlyingData(symbol) {
        // Instead of creating new dates, use the date inputs that are already set up
        const startDateInput = document.getElementById('stock-start-date');
        const endDateInput = document.getElementById('stock-end-date');

        // Get values from the inputs, with fallbacks to ensure we don't use future dates
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Format yesterday as a string for comparison
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Get dates from inputs, with validation
        let startDate = startDateInput ? startDateInput.value : '';
        let endDate = endDateInput ? endDateInput.value : '';

        // Ensure we're not requesting future data
        if (!endDate || endDate > yesterdayStr) {
            endDate = yesterdayStr;
        }

        // Ensure start date is before end date and not in the future
        if (!startDate || startDate > endDate) {
            // Default to 1 year ago from end date
            const defaultStartDate = new Date(endDate);
            defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);
            startDate = defaultStartDate.toISOString().split('T')[0];
        }

        console.log(`Loading stock data for ${symbol} from ${startDate} to ${endDate}`);

        API.getStockData(symbol, startDate, endDate)
            .then(data => {
                if (data && data.length > 0) {
                    this.stockData = data;

                    // Get latest price
                    const latestData = data[data.length - 1];
                    const currentPrice = latestData.close;

                    // Update stock price display
                    this.updateStockPriceDisplay(currentPrice);

                    // Calculate historical volatility
                    this.analyticsModule.updateVolatilityMetrics(data);

                    // Update implied move analysis if options data is available
                    if (this.currentOptionsData) {
                        this.analyticsModule.updateImpliedMoveAnalysis();
                    }

                    // Highlight ATM options
                    this.chainModule.highlightAtTheMoney(currentPrice);
                }
            })
            .catch(error => {
                console.error('Error loading stock data:', error);
                const stockPriceContainer = document.getElementById('stock-price-container');
                if (stockPriceContainer) {
                    stockPriceContainer.classList.add('d-none');
                }
            });
    }

    /**
     * Update stock price display
     * @param {number} currentPrice - Current stock price
     */
    updateStockPriceDisplay(currentPrice) {
        const stockPriceElement = document.getElementById('current-stock-price');
        if (stockPriceElement) {
            stockPriceElement.textContent = this.formatCurrency(currentPrice);
        }

        const stockPriceContainer = document.getElementById('stock-price-container');
        if (stockPriceContainer) {
            stockPriceContainer.classList.remove('d-none');
        }
    }

    /**
     * Initialize UI components from templates
     */
    initializeUIComponents() {
        // Add the options analytics section template
        const analyticsTemplate = document.getElementById('options-analytics-template');
        if (analyticsTemplate) {
            const allOptions = document.getElementById('all-options');
            if (allOptions) {
                allOptions.appendChild(analyticsTemplate.content.cloneNode(true));
            }
        }

        // Add the advanced analysis section template
        const advancedTemplate = document.getElementById('advanced-analysis-template');
        if (advancedTemplate) {
            const allOptions = document.getElementById('all-options');
            if (allOptions) {
                allOptions.appendChild(advancedTemplate.content.cloneNode(true));
            }
        }

        // Add the options filtering section template
        const filtersTemplate = document.getElementById('options-filters-template');
        if (filtersTemplate) {
            const allOptions = document.getElementById('all-options');
            if (allOptions) {
                allOptions.appendChild(filtersTemplate.content.cloneNode(true));
            }
        }

        // Update strategy expiration dates if we have data
        if (this.currentOptionsData && this.currentOptionsData.length > 0) {
            this.strategiesModule.updateStrategyExpirationDates();
        }

        // Set up refresh button for expiration dates
        const refreshButton = document.getElementById('refresh-expiration-dates');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.strategiesModule.updateStrategyExpirationDates();
            });
        }

        // Set up filtering event listeners
        this.chainModule.setupFilterEventListeners();
    }

    /**
     * Format a date string
     * @param {string} dateStr - Date string
     * @returns {string} - Formatted date
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format currency value
     * @param {number} value - Value to format
     * @returns {string} - Formatted string
     */
    formatCurrency(value) {
        if (value === undefined || value === null) return 'N/A';
        return '$' + parseFloat(value).toFixed(2);
    }
}

// Create and export instance
const optionsView = new OptionsView();

// Named export for the instance - this is the recommended pattern
export { optionsView };

// Also provide a default export for backward compatibility
export default optionsView;