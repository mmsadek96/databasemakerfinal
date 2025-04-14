/**
 * Options UI Controller
 *
 * Responsible for rendering the options data and managing user interactions
 * Connects the data manager with the UI
 */
import optionsDataManager from './optionsDataManager.js';

class OptionsUIController {
    constructor() {
        // UI state
        this.symbol = '';
        this.currentExpiration = null;
        this.includeGreeks = false;
        this.stockPrice = null;
        this.selectedViewMode = 'chain'; // 'chain' or 'analysis'

        // DOM elements - will be set on initialization
        this.elements = {};

        // Chart instances
        this.charts = {
            volatilitySkew: null,
            putCallRatio: null,
            optionVolume: null
        };
    }

    /**
     * Initialize the UI controller
     */
    initialize() {
        console.log('Initializing Options UI Controller');

        // Store references to DOM elements
        this.elements = {
            // Main containers
            optionsContainer: document.getElementById('options-container'),
            loadingIndicator: document.getElementById('options-loading'),
            errorDisplay: document.getElementById('options-error'),

            // Input controls
            symbolInput: document.getElementById('options-symbol'),
            greeksCheckbox: document.getElementById('include-greeks'),
            loadButton: document.getElementById('load-options-button'),

            // Tabs and content
            tabsContainer: document.getElementById('options-tabs'),
            tabsContent: document.getElementById('options-tabs-content'),

            // Analytics sections
            analyticsContainer: document.getElementById('options-analytics'),
            advancedAnalysisBtn: document.getElementById('toggle-advanced'),
            advancedAnalysisSection: document.getElementById('advanced-analysis'),

            // Analysis containers
            impliedMoveContainer: document.getElementById('implied-move-container'),

            // Tabs within the advanced section
            volatilityTab: document.getElementById('volatility-tab'),
            volumeTab: document.getElementById('volume-tab'),
            strategyTab: document.getElementById('strategy-tab'),

            // Chart canvases
            volatilitySkewChart: document.getElementById('volatility-skew-chart'),
            putCallRatioChart: document.getElementById('put-call-ratio-chart'),
            optionVolumeChart: document.getElementById('option-volume-chart')
        };

        // Set up event listeners
        this.setupEventListeners();

        // Set up event handlers for data manager events
        this.setupDataManagerEvents();

        // Check URL parameters for symbol
        this.checkUrlParameters();
    }

    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        // Load button click
        this.elements.loadButton.addEventListener('click', () => {
            this.loadOptionsData();
        });

        // Symbol input on Enter key
        this.elements.symbolInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadOptionsData();
            }
        });

        // Toggle advanced analysis section
        if (this.elements.advancedAnalysisBtn) {
            this.elements.advancedAnalysisBtn.addEventListener('click', () => {
                this.toggleAdvancedAnalysis();
            });
        }

        // Use event delegation for dynamically created tabs
        this.elements.tabsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                this.handleTabClick(e.target);
            }
        });
    }

    /**
     * Set up event handlers for data manager events
     */
    setupDataManagerEvents() {
        // Data loaded event
        optionsDataManager.on('dataLoaded', (data) => {
            this.hideLoading();
            this.renderOptionsData(data.symbol);
        });

        // Error event
        optionsDataManager.on('error', (data) => {
            this.hideLoading();
            this.showError(data.error);
        });
    }

    /**
     * Check URL parameters for symbol
     */
    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const symbol = urlParams.get('symbol');

        if (symbol) {
            this.elements.symbolInput.value = symbol.toUpperCase();
            // Load after a short delay to ensure UI is ready
            setTimeout(() => this.loadOptionsData(), 100);
        }
    }

    /**
     * Load options data for the entered symbol
     */
    loadOptionsData() {
        const symbol = this.elements.symbolInput.value.trim().toUpperCase();
        const includeGreeks = this.elements.greeksCheckbox.checked;

        if (!symbol) {
            this.showError('Please enter a stock symbol');
            return;
        }

        this.symbol = symbol;
        this.includeGreeks = includeGreeks;

        // Show loading state
        this.showLoading();

        // Clear any existing error
        this.hideError();

        // Reset any existing data view
        this.resetView();

        // Fetch stock price (simulation - in real app, fetch from API)
        this.fetchStockPrice(symbol).then(price => {
            this.stockPrice = price;

            // Update URL without refreshing the page
            const url = new URL(window.location);
            url.searchParams.set('symbol', symbol);
            window.history.pushState({}, '', url);

            // Fetch options data
            return optionsDataManager.fetchOptionsData(symbol, includeGreeks);
        }).catch(error => {
            this.hideLoading();
            this.showError(error.message);
        });
    }

    /**
     * Fetch current stock price for a symbol
     * In real application, this would call your API
     * @param {string} symbol - Stock symbol
     * @returns {Promise<number>} - Promise resolving to stock price
     */
    async fetchStockPrice(symbol) {
        // This is a placeholder - in a real app, fetch from your API
        // For demo, return a simulated price between 10 and 1000
        // Based on a hash of the symbol string for consistency
        let hash = 0;
        for (let i = 0; i < symbol.length; i++) {
            hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
            hash |= 0; // Convert to 32-bit integer
        }

        // Generate a price between 10 and 1000 based on the hash
        const basePrice = Math.abs(hash % 991) + 10;

        // Add some randomness for realistic variation
        const randomFactor = 1 + (Math.random() * 0.01 - 0.005);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve(basePrice * randomFactor);
            }, 300); // Simulate network delay
        });
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.remove('d-none');
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.add('d-none');
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        if (this.elements.errorDisplay) {
            this.elements.errorDisplay.classList.remove('d-none');
            const errorMessage = this.elements.errorDisplay.querySelector('#options-error-message');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (this.elements.errorDisplay) {
            this.elements.errorDisplay.classList.add('d-none');
        }
    }

    /**
     * Reset the options view
     */
    resetView() {
        // Reset tabs
        this.elements.tabsContainer.innerHTML = `
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="all-tab" data-bs-toggle="tab" data-bs-target="#all-options" type="button" role="tab">All Expirations</button>
            </li>
        `;

        // Reset tabs content
        this.elements.tabsContent.innerHTML = `
            <div class="tab-pane fade show active" id="all-options" role="tabpanel">
                <p class="text-muted">Enter a stock symbol to load options data</p>
            </div>
        `;

        // Hide analytics sections
        if (this.elements.analyticsContainer) {
            this.elements.analyticsContainer.classList.add('d-none');
        }

        if (this.elements.advancedAnalysisSection) {
            this.elements.advancedAnalysisSection.classList.add('d-none');
        }

        // Reset current expiration
        this.currentExpiration = null;

        // Reset charts
        this.destroyCharts();
    }

    /**
     * Toggle advanced analysis section
     */
    toggleAdvancedAnalysis() {
        if (this.elements.advancedAnalysisSection) {
            const isHidden = this.elements.advancedAnalysisSection.classList.contains('d-none');

            if (isHidden) {
                this.elements.advancedAnalysisSection.classList.remove('d-none');
                this.elements.advancedAnalysisBtn.textContent = 'Hide Advanced Analysis';

                // Initialize or update charts when section becomes visible
                this.updateAllCharts();
            } else {
                this.elements.advancedAnalysisSection.classList.add('d-none');
                this.elements.advancedAnalysisBtn.textContent = 'Show Advanced Analysis';
            }
        }
    }

    /**
     * Handle tab click - switch between different expiration dates
     * @param {HTMLElement} tab - The clicked tab element
     */
    handleTabClick(tab) {
        // Remove active class from all tabs
        const tabs = this.elements.tabsContainer.querySelectorAll('.nav-link');
        tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });

        // Add active class to clicked tab
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        // Get expiration date from tab
        const expDate = tab.textContent.trim();

        // If this is All Expirations tab, reset current expiration
        if (expDate === 'All Expirations') {
            this.currentExpiration = null;
        } else {
            this.currentExpiration = expDate;

            // Update the volatility skew chart
            this.updateVolatilitySkewChart();

            // Update implied move calculation
            this.updateImpliedMoveAnalysis();
        }

        // Show the target tab pane
        const targetPaneId = tab.getAttribute('data-bs-target');

        // Hide all tab panes
        const tabPanes = this.elements.tabsContent.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.remove('show', 'active');
        });

        // Show the target pane
        const targetPane = document.querySelector(targetPaneId);
        if (targetPane) {
            targetPane.classList.add('show', 'active');
        }
    }

    /**
     * Render options data
     * @param {string} symbol - Stock symbol
     */
    renderOptionsData(symbol) {

        console.log("renderOptionsData called for", symbol);
        const optionsChain = optionsDataManager.getOptionsChain(symbol);
        console.log("Options chain data:", optionsChain);

        if (!optionsChain) {
            this.showError(`No options data available for ${symbol}`);
            return;
        }

        // Get expiration dates
        const expirationDates = optionsDataManager.getExpirationDates(symbol);

        if (expirationDates.length === 0) {
            this.showError(`No expiration dates found for ${symbol}`);
            return;
        }

        // Generate tabs for each expiration date
        this.createExpirationTabs(expirationDates);

        // Create tab content for each expiration
        this.createTabContent(expirationDates);

        // Update UI with stock price and info
        this.updateStockInfo();

        // Show analytics section
        this.elements.analyticsContainer.classList.remove('d-none');

        // Update analytics data
        this.updateAnalytics();

        // Set first expiration as current if not set
        if (!this.currentExpiration) {
            this.currentExpiration = expirationDates[0];
        }

        // Show "data from database" indicator if needed
        this.showDataSourceIndicator(optionsDataManager.lastUpdated);
    }

    /**
     * Show data source indicator
     * @param {Date} lastUpdated - Time the data was last updated
     */
    showDataSourceIndicator(lastUpdated) {
        // Create an indicator element if it doesn't exist
        let indicator = document.getElementById('data-source-indicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'data-source-indicator';
            indicator.className = 'alert alert-info';
            indicator.innerHTML = `
                <i class="bi bi-database"></i>
                <span>Options data loaded from database.</span>
                <span id="last-updated-time"></span>
            `;

            this.elements.optionsContainer.prepend(indicator);
        }

        // Update last updated time
        const timeElement = document.getElementById('last-updated-time');
        if (timeElement && lastUpdated) {
            const timeAgo = this.getTimeAgo(lastUpdated);
            timeElement.textContent = ` Last updated: ${timeAgo}.`;
        }
    }

    /**
     * Create tabs for expiration dates
     * @param {Array} expirationDates - Sorted expiration dates
     */
    createExpirationTabs(expirationDates) {
        this.elements.tabsContainer.innerHTML = `
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="all-tab" data-bs-toggle="tab" data-bs-target="#all-options" type="button" role="tab">All Expirations</button>
            </li>
        `;

        expirationDates.forEach(expDate => {
            const formattedExpiry = this.formatDateForDisplay(expDate);
            const tabId = `exp-${expDate.replace(/[\/\s-]/g, '')}`;

            const tabLi = document.createElement('li');
            tabLi.className = 'nav-item';
            tabLi.role = 'presentation';

            tabLi.innerHTML = `
                <button class="nav-link" id="${tabId}-tab" data-bs-toggle="tab" data-bs-target="#${tabId}" type="button" role="tab">
                    ${formattedExpiry}
                </button>
            `;

            this.elements.tabsContainer.appendChild(tabLi);

        });
    }

    /**
     * Create tab content for each expiration date
     * @param {Array} expirationDates - Sorted expiration dates
     */
    createTabContent(expirationDates) {
        // Clear existing content
        this.elements.tabsContent.innerHTML = '';

        // Create all-options tab pane
        const allOptionsPane = document.createElement('div');
        allOptionsPane.className = 'tab-pane fade show active';
        allOptionsPane.id = 'all-options';
        allOptionsPane.role = 'tabpanel';

        // Add stock info and controls
        let allOptionsHtml = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4>${this.symbol} Options</h4>
                <div class="d-flex">
                    <div id="stock-price-container" class="me-3">
                        <span class="fw-bold">Current Price:</span>
                        <span id="current-stock-price" class="text-primary fw-bold">$${this.stockPrice.toFixed(2)}</span>
                    </div>
                    <button class="btn btn-primary" id="toggle-advanced">Show Advanced Analysis</button>
                </div>
            </div>
        `;

        allOptionsPane.innerHTML = allOptionsHtml;
        this.elements.tabsContent.appendChild(allOptionsPane);

        // Generate tabs and content for each expiration date
        expirationDates.forEach((expDate, index) => {
            const formattedExpiry = this.formatDateForDisplay(expDate);
            const options = optionsDataManager.getOptionsForExpiration(this.symbol, expDate);
            const tabId = `exp-${expDate.replace(/[\/\s-]/g, '')}`;
            // Create options table for this expiration
            const optionsTable = this.createOptionsTable(options, expDate);
            // Add tab content
            const tabPane = document.createElement('div');
            tabPane.className = 'tab-pane fade';
            tabPane.id = tabId;
            tabPane.role = 'tabpanel';

            tabPane.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4>${this.symbol} Options - Expiration: ${formattedExpiry}</h4>
                    <div id="expiry-countdown" class="badge bg-dark"></div>
                </div>
            `;

            tabPane.appendChild(optionsTable);
            this.elements.tabsContent.appendChild(tabPane);

            // Add to all options view (limited to first 3 expirations)
            if (index < 3) {
                const allOptionsSection = document.createElement('div');
                allOptionsSection.innerHTML = `
                    <h5 class="mt-4 bg-light p-2 rounded">Expiration: ${formattedExpiry}</h5>
                `;

                allOptionsSection.appendChild(optionsTable.cloneNode(true));
                allOptionsPane.appendChild(allOptionsSection);
            }
        });

        // If there are more than 3 expirations, add a note
        if (expirationDates.length > 3) {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'alert alert-info mt-3';
            noteDiv.innerHTML = `
                <i class="bi bi-info-circle"></i>
                Showing options for the first 3 expiration dates.
                Use the tabs above to view all available expiration dates.
            `;
            allOptionsPane.appendChild(noteDiv);
        }

        // Update the advanced analysis button reference
        this.elements.advancedAnalysisBtn = document.getElementById('toggle-advanced');
        // Reconnect event listener
        if (this.elements.advancedAnalysisBtn) {
            this.elements.advancedAnalysisBtn.addEventListener('click', () => {
                this.toggleAdvancedAnalysis();
            });
        }
    }

    /**
     * Create options table for a specific expiration
     * @param {Object} options - Options data for the expiration
     * @param {string} expDate - Expiration date
     * @returns {HTMLTableElement} - Options table
     */
    createOptionsTable(options, expDate) {
    if (!options) return document.createElement('div');

    // Separate calls and puts
    const calls = options.calls || [];
    const puts = options.puts || [];

    // Create table
    const table = document.createElement('table');
    table.className = 'table table-sm table-striped table-hover options-table';
    table.setAttribute('data-expiration', expDate);

    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'bg-dark text-white';

    // Call columns
    const callColumns = ['Last', 'Change', 'Bid', 'Ask', 'Vol', 'OI'];
    if (this.includeGreeks) {
        callColumns.push('IV', 'Delta', 'Gamma', 'Theta', 'Vega');
    }

    // Add header cells for calls
    callColumns.forEach(col => {
        const th = document.createElement('th');
        th.className = 'text-end px-2';
        th.textContent = col;
        headerRow.appendChild(th);
    });

    // Strike column
    const strikeHeader = document.createElement('th');
    strikeHeader.className = 'text-center bg-light px-3';
    strikeHeader.textContent = 'Strike';
    headerRow.appendChild(strikeHeader);

    // Put columns
    const putColumns = ['Last', 'Change', 'Bid', 'Ask', 'Vol', 'OI'];
    if (this.includeGreeks) {
        putColumns.push('IV', 'Delta', 'Gamma', 'Theta', 'Vega');
    }

    // Add header cells for puts
    putColumns.forEach(col => {
        const th = document.createElement('th');
        th.className = 'text-end px-2';
        th.textContent = col;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    // Get all unique strike prices
    const allStrikes = new Set();
    calls.forEach(call => allStrikes.add(parseFloat(call.strike_price)));
    puts.forEach(put => allStrikes.add(parseFloat(put.strike_price)));

    // Convert to array and sort
    const sortedStrikes = Array.from(allStrikes).sort((a, b) => a - b);

    // Create rows for each strike
    sortedStrikes.forEach(strike => {
        const row = document.createElement('tr');
        row.setAttribute('data-strike', strike);

        // Find call and put for this strike
        const call = calls.find(c => parseFloat(c.strike_price) === strike);
        const put = puts.find(p => parseFloat(p.strike_price) === strike);

        // Call cells
        if (call) {
            this.addOptionCells(row, call, callColumns, 'call');
        } else {
            // Empty cells for call
            callColumns.forEach(() => {
                const td = document.createElement('td');
                row.appendChild(td);
            });
        }

        // Strike cell
        const strikeCell = document.createElement('td');
        strikeCell.className = 'text-center bg-light fw-bold strike-price px-3';
        strikeCell.textContent = strike.toFixed(2);
        row.appendChild(strikeCell);

        // Put cells
        if (put) {
            this.addOptionCells(row, put, putColumns, 'put');
        } else {
            // Empty cells for put
            putColumns.forEach(() => {
                const td = document.createElement('td');
                row.appendChild(td);
            });
        }

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Highlight ATM rows if we have stock price
    if (this.stockPrice) {
        this.highlightAtTheMoneyOptions(table, this.stockPrice);
    }

    return table;
}

    /**
     * Add cells for an option to a table row
     * @param {HTMLTableRowElement} row - Table row
     * @param {Object} option - Option data
     * @param {Array} columns - Columns to display
     * @param {string} type - Option type ('call' or 'put')
     */
    addOptionCells(row, option, columns, type) {
    const cellClass = type === 'call' ? 'call-cell' : 'put-cell';

    columns.forEach(col => {
        const td = document.createElement('td');
        td.className = `text-end px-2 ${cellClass}`;

        switch (col) {
            case 'Last':
                td.textContent = this.formatCurrency(option.last_price);
                td.className += ' fw-bold';

                // Make cell clickable to show option details
                td.style.cursor = 'pointer';
                td.setAttribute('data-bs-toggle', 'tooltip');
                td.setAttribute('data-bs-title', option.contract_name);
                td.addEventListener('click', () => this.showOptionDetails(option));
                break;

            case 'Change':
                // If change isn't in the data, show 0.00
                const changeValue = option.change || 0;
                td.textContent = `${changeValue >= 0 ? '+' : ''}${parseFloat(changeValue).toFixed(2)}`;
                td.className += changeValue >= 0 ? ' text-success' : ' text-danger';
                break;

            case 'Bid':
                td.textContent = this.formatCurrency(option.bid);
                break;

            case 'Ask':
                td.textContent = this.formatCurrency(option.ask);

                // Highlight wide spreads
                const spread = parseFloat(option.ask) - parseFloat(option.bid);
                const spreadPct = parseFloat(option.bid) > 0 ? (spread / parseFloat(option.bid)) * 100 : 0;

                if (spreadPct > 20) {
                    td.className += ' text-danger';
                    td.setAttribute('data-bs-toggle', 'tooltip');
                    td.setAttribute('data-bs-title', `Wide spread: ${spreadPct.toFixed(1)}%`);
                }
                break;

            case 'Vol':
                td.textContent = this.formatNumber(option.volume);

                // Highlight high volume
                if (parseInt(option.volume) > 1000) {
                    td.className += ' text-primary fw-bold';
                }
                break;

            case 'OI':
                td.textContent = this.formatNumber(option.open_interest);

                // Highlight high open interest
                if (parseInt(option.open_interest) > 5000) {
                    td.className += ' text-primary fw-bold';
                }
                break;

            case 'IV':
                if (option.implied_volatility !== undefined) {
                    const ivValue = parseFloat(option.implied_volatility) * 100;
                    td.textContent = ivValue.toFixed(1) + '%';

                    // Color code IV
                    if (ivValue > 100) {
                        td.className += ' text-danger fw-bold';
                    } else if (ivValue > 50) {
                        td.className += ' text-warning';
                    }
                } else {
                    td.textContent = '-';
                }
                break;

            case 'Delta':
                if (option.delta !== undefined) {
                    td.textContent = parseFloat(option.delta).toFixed(3);

                    // Highlight extreme deltas
                    const absValue = Math.abs(parseFloat(option.delta));
                    if (absValue > 0.9) {
                        td.className += ' text-danger';
                    }
                } else {
                    td.textContent = '-';
                }
                break;

            case 'Gamma':
                if (option.gamma !== undefined) {
                    td.textContent = parseFloat(option.gamma).toFixed(4);

                    // Highlight high gamma
                    if (parseFloat(option.gamma) > 0.05) {
                        td.className += ' text-warning fw-bold';
                    }
                } else {
                    td.textContent = '-';
                }
                break;

            case 'Theta':
                if (option.theta !== undefined) {
                    td.textContent = parseFloat(option.theta).toFixed(4);

                    // Highlight high negative theta
                    if (parseFloat(option.theta) < -0.01) {
                        td.className += ' text-danger';
                    }
                } else {
                    td.textContent = '-';
                }
                break;

            case 'Vega':
                if (option.vega !== undefined) {
                    td.textContent = parseFloat(option.vega).toFixed(4);

                    // Highlight high vega
                    if (parseFloat(option.vega) > 0.1) {
                        td.className += ' text-info';
                    }
                } else {
                    td.textContent = '-';
                }
                break;

            default:
                td.textContent = option[col.toLowerCase()] || '-';
        }

        row.appendChild(td);
    });
}

    /**
     * Highlight at-the-money options in a table
     * @param {HTMLTableElement} table - Options table
     * @param {number} stockPrice - Current stock price
     */
    highlightAtTheMoneyOptions(table, stockPrice) {
        // Find all rows with strike price
        const rows = table.querySelectorAll('tbody tr');

        // Track the closest strike to ATM
        let closestStrike = null;
        let minDiff = Infinity;

        // Find the closest strike to the current price
        rows.forEach(row => {
            const strike = parseFloat(row.getAttribute('data-strike'));
            const diff = Math.abs(strike - stockPrice);

            if (diff < minDiff) {
                minDiff = diff;
                closestStrike = strike;
            }
        });

        if (closestStrike === null) return;

        // Highlight ATM rows (exact match and within 5%)
        const atmThreshold = stockPrice * 0.05; // 5% threshold

        rows.forEach(row => {
            const strike = parseFloat(row.getAttribute('data-strike'));
            const diff = Math.abs(strike - stockPrice);

            if (strike === closestStrike) {
                // Exact ATM
                row.classList.add('table-primary');
                const strikeCell = row.querySelector('.strike-price');
                if (strikeCell) {a
                    strikeCell.classList.add('bg-primary', 'text-white');
                }
            } else if (diff <= atmThreshold) {
                // Near ATM
                row.classList.add('table-info');
            }
        });
    }

    /**
     * Show detailed information for an option
     * @param {Object} option - Option data
     */
    showOptionDetails(option) {
        // Create a modal dynamically or use a template if it exists
        const modalContent = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-dark text-white">
                        <h5 class="modal-title">Option Contract Details</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card border-primary mb-3">
                                    <div class="card-header bg-primary text-white">Contract Details</div>
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Contract ID:</span>
                                            <span class="fw-bold">${option.contractID}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Symbol:</span>
                                            <span class="fw-bold">${option.symbol}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Contract Type:</span>
                                            <span class="fw-bold">${option.type.toUpperCase()}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Strike Price:</span>
                                            <span class="fw-bold">${this.formatCurrency(option.strike)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Expiration Date:</span>
                                            <span class="fw-bold">${this.formatDateForDisplay(option.expiration)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span>Contract Size:</span>
                                            <span class="fw-bold">100 shares</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card border-success mb-3">
                                    <div class="card-header bg-success text-white">Pricing</div>
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Last Price:</span>
                                            <span class="fw-bold">${this.formatCurrency(option.last)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Mark Price:</span>
                                            <span class="fw-bold">${this.formatCurrency(option.mark)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Bid Price:</span>
                                            <span class="fw-bold">${this.formatCurrency(option.bid)} (${option.bid_size})</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Ask Price:</span>
                                            <span class="fw-bold">${this.formatCurrency(option.ask)} (${option.ask_size})</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Bid-Ask Spread:</span>
                                            <span class="fw-bold">${this.formatCurrency(parseFloat(option.ask) - parseFloat(option.bid))}</span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span>Contract Value:</span>
                                            <span class="fw-bold">${this.formatCurrency(parseFloat(option.last) * 100)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card border-info mb-3">
                                    <div class="card-header bg-info text-white">Volume & Open Interest</div>
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Volume:</span>
                                            <span class="fw-bold">${this.formatNumber(option.volume)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Open Interest:</span>
                                            <span class="fw-bold">${this.formatNumber(option.open_interest)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span>Volume / OI Ratio:</span>
                                            <span class="fw-bold">${parseInt(option.open_interest) > 0 ? (parseInt(option.volume) / parseInt(option.open_interest)).toFixed(2) : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card border-warning mb-3">
                                    <div class="card-header bg-warning text-dark">Greeks</div>
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Implied Volatility:</span>
                                            <span class="fw-bold">${option.implied_volatility ? (parseFloat(option.implied_volatility) * 100).toFixed(2) + '%' : 'N/A'}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Delta:</span>
                                            <span class="fw-bold">${option.delta ? parseFloat(option.delta).toFixed(4) : 'N/A'}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Gamma:</span>
                                            <span class="fw-bold">${option.gamma ? parseFloat(option.gamma).toFixed(4) : 'N/A'}</span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Theta:</span>
                                            <span class="fw-bold">${option.theta ? parseFloat(option.theta).toFixed(4) : 'N/A'}</span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span>Vega:</span>
                                            <span class="fw-bold">${option.vega ? parseFloat(option.vega).toFixed(4) : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Create modal element
        let modalElement = document.getElementById('optionDetailsModal');

        if (!modalElement) {
            modalElement = document.createElement('div');
            modalElement.id = 'optionDetailsModal';
            modalElement.className = 'modal fade';
            modalElement.tabIndex = '-1';
            modalElement.setAttribute('aria-hidden', 'true');
            document.body.appendChild(modalElement);
        }

        // Set modal content
        modalElement.innerHTML = modalContent;

        // Initialize and show modal (using Bootstrap)
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }

    /**
     * Update stock information display
     */
    updateStockInfo() {
        const stockPriceElement = document.getElementById('current-stock-price');

        if (stockPriceElement && this.stockPrice) {
            stockPriceElement.textContent = `$${this.stockPrice.toFixed(2)}`;
        }
    }

    /**
     * Update analytics display with options metrics
     */
    updateAnalytics() {
        const metrics = optionsDataManager.getMetrics(this.symbol);

        if (!metrics) return;

        // Update summary metrics
        this.updateElement('total-call-volume', this.formatNumber(metrics.volumeByExpiration[this.currentExpiration]?.calls || 0));
        this.updateElement('total-put-volume', this.formatNumber(metrics.volumeByExpiration[this.currentExpiration]?.puts || 0));
        this.updateElement('put-call-volume-ratio', (metrics.volumeByExpiration[this.currentExpiration]?.ratio || 0).toFixed(2));

        // Update open interest metrics
        this.updateElement('total-call-oi', this.formatNumber(metrics.totalCalls));
        this.updateElement('total-put-oi', this.formatNumber(metrics.totalPuts));
        this.updateElement('put-call-oi-ratio', metrics.putCallRatio.toFixed(2));

        // Update expiration count
        this.updateElement('expiration-count', metrics.expirationDates.length);

        // Update sentiment indicator
        this.updateSentimentIndicator(metrics.volumeByExpiration[this.currentExpiration]?.ratio || 0);

        // Update implied move analysis if we have an expiration date and stock price
        if (this.currentExpiration && this.stockPrice) {
            this.updateImpliedMoveAnalysis();
        }
    }

    /**
     * Update sentiment indicator based on put/call ratio
     * @param {number} putCallRatio - Put/call volume ratio
     */
    updateSentimentIndicator(putCallRatio) {
        const sentimentElement = document.getElementById('options-sentiment');

        if (!sentimentElement) return;

        // Default to neutral
        let sentiment = 'Neutral';
        let className = 'text-secondary fw-bold';

        // Determine sentiment based on put/call ratio
        if (putCallRatio > 1.5) {
            sentiment = 'Bearish';
            className = 'text-danger fw-bold';
        } else if (putCallRatio > 1.0) {
            sentiment = 'Somewhat Bearish';
            className = 'text-warning fw-bold';
        } else if (putCallRatio > 0.7) {
            sentiment = 'Neutral';
            className = 'text-secondary fw-bold';
        } else if (putCallRatio > 0.5) {
            sentiment = 'Somewhat Bullish';
            className = 'text-info fw-bold';
        } else {
            sentiment = 'Bullish';
            className = 'text-success fw-bold';
        }

        sentimentElement.textContent = sentiment;
        sentimentElement.className = className;
    }

    /**
     * Update the implied move analysis based on ATM options
     */
    updateImpliedMoveAnalysis() {
        if (!this.currentExpiration || !this.stockPrice) return;

        const impliedMove = optionsDataManager.calculateImpliedMove(
            this.symbol,
            this.currentExpiration,
            this.stockPrice
        );

        if (!impliedMove) {
            console.warn('Could not calculate implied move');
            return;
        }

        // Update elements with implied move data
        this.updateElement('implied-move', impliedMove.impliedMovePercent.toFixed(2) + '%');
        this.updateElement('straddle-price', this.formatCurrency(impliedMove.straddlePrice));
        this.updateElement('days-to-expiry', impliedMove.daysToExpiry);

        const expectedRange = `${this.formatCurrency(impliedMove.expectedRange.low)} - ${this.formatCurrency(impliedMove.expectedRange.high)}`;
        this.updateElement('expected-range', expectedRange);

        // Show implied move container
        if (this.elements.impliedMoveContainer) {
            this.elements.impliedMoveContainer.classList.remove('d-none');
        }
    }

    /**
     * Update all chart displays
     */
    updateAllCharts() {
        if (!this.elements.advancedAnalysisSection || this.elements.advancedAnalysisSection.classList.contains('d-none')) {
            return;
        }

        // Ensure Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Initialize/update each chart
        this.updateVolatilitySkewChart();
        this.updatePutCallRatioChart();
        this.updateOptionsVolumeChart();
    }

    /**
     * Update volatility skew chart
     */
    updateVolatilitySkewChart() {
        if (!this.currentExpiration) return;

        const skewData = optionsDataManager.calculateVolatilitySkew(
            this.symbol,
            this.currentExpiration
        );

        if (!skewData) {
            console.warn('No volatility skew data available');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.volatilitySkew) {
            this.charts.volatilitySkew.destroy();
        }

        // Get the chart canvas
        const skewCtx = this.elements.volatilitySkewChart;
        if (!skewCtx) return;

        // Create new chart
        this.charts.volatilitySkew = new Chart(skewCtx.getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Calls IV',
                        data: skewData.calls.map(item => ({
                            x: item.strike,
                            y: item.iv
                        })),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        pointRadius: 5
                    },
                    {
                        label: 'Puts IV',
                        data: skewData.puts.map(item => ({
                            x: item.strike,
                            y: item.iv
                        })),
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        pointRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Volatility Skew (${this.formatDateForDisplay(this.currentExpiration)})`,
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return `Strike: ${point.x}, IV: ${(point.y * 100).toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Strike Price ($)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Implied Volatility (%)'
                        },
                        ticks: {
                            callback: function(value) {
                                return (value * 100).toFixed(0) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Update put/call ratio chart
     */
    updatePutCallRatioChart() {
        const metrics = optionsDataManager.getMetrics(this.symbol);

        if (!metrics || !metrics.volumeByExpiration) {
            console.warn('No metrics available for put/call ratio chart');
            return;
        }

        // Prepare data for chart
        const labels = [];
        const ratios = [];

        Object.entries(metrics.volumeByExpiration).forEach(([date, data]) => {
            labels.push(this.formatDateForDisplay(date));
            ratios.push(data.ratio);
        });

        // Destroy existing chart if it exists
        if (this.charts.putCallRatio) {
            this.charts.putCallRatio.destroy();
        }

        // Get the chart canvas
        const ratioCtx = this.elements.putCallRatioChart;
        if (!ratioCtx) return;

        // Create new chart
        this.charts.putCallRatio = new Chart(ratioCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Put/Call Ratio',
                    data: ratios,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Put/Call Volume Ratio by Expiration',
                        font: { size: 16 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Ratio'
                        }
                    }
                }
            }
        });
    }

    /**
     * Update options volume chart
     */
    updateOptionsVolumeChart() {
        if (!this.currentExpiration) return;

        const options = optionsDataManager.getOptionsForExpiration(
            this.symbol,
            this.currentExpiration
        );

        if (!options) {
            console.warn('No options data available for volume chart');
            return;
        }

        // Organize data by strike price
        const strikeMap = new Map();

        // Process calls
        options.calls.forEach(call => {
            const strike = parseFloat(call.strike);
            if (!strikeMap.has(strike)) {
                strikeMap.set(strike, { calls: 0, puts: 0 });
            }
            strikeMap.get(strike).calls += parseInt(call.volume) || 0;
        });

        // Process puts
        options.puts.forEach(put => {
            const strike = parseFloat(put.strike);
            if (!strikeMap.has(strike)) {
                strikeMap.set(strike, { calls: 0, puts: 0 });
            }
            strikeMap.get(strike).puts += parseInt(put.volume) || 0;
        });

        // Sort strikes and prepare data arrays
        const strikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);
        const callVolumes = strikes.map(strike => strikeMap.get(strike).calls);
        const putVolumes = strikes.map(strike => strikeMap.get(strike).puts);

        // Format strike labels
        const strikeLabels = strikes.map(strike => strike.toFixed(2));

        // Destroy existing chart if it exists
        if (this.charts.optionVolume) {
            this.charts.optionVolume.destroy();
        }

        // Get the chart canvas
        const volumeCtx = this.elements.optionVolumeChart;
        if (!volumeCtx) return;

        // Create new chart
        this.charts.optionVolume = new Chart(volumeCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: strikeLabels,
                datasets: [
                    {
                        label: 'Call Volume',
                        data: callVolumes,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Put Volume',
                        data: putVolumes,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Option Volume by Strike (${this.formatDateForDisplay(this.currentExpiration)})`,
                        font: { size: 16 }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Strike Price ($)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Volume'
                        }
                    }
                }
            }
        });
    }

    /**
     * Destroy chart instances to prevent memory leaks
     */
    destroyCharts() {
        Object.entries(this.charts).forEach(([name, chart]) => {
            if (chart) {
                chart.destroy();
                this.charts[name] = null;
            }
        });
    }

    /**
     * Helper to safely update an element's text content
     * @param {string} elementId - Element ID
     * @param {string} text - Text content
     */
    updateElement(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Format currency value
     * @param {number|string} value - Value to format
     * @returns {string} - Formatted currency string
     */
    formatCurrency(value) {
        if (value === undefined || value === null) return 'N/A';
        return '$ ' + parseFloat(value).toFixed(2);
    }

    /**
     * Format number with thousands separators
     * @param {number|string} value - Value to format
     * @returns {string} - Formatted number
     */
    formatNumber(value) {
        if (value === undefined || value === null) return 'N/A';
        return new Intl.NumberFormat().format(parseInt(value));
    }



    /**
     * Format date for display
     * @param {string} dateStr - ISO date string
     * @returns {string} - Formatted date
     */
    formatDateForDisplay(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateStr;
        }
    }

    /**
     * Get human-readable time ago string
     * @param {Date} date - Date to compare
     * @returns {string} - Time ago string
     */
    getTimeAgo(date) {
        if (!date) return '';

        const seconds = Math.floor((new Date() - date) / 1000);

        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) {
            return interval + ' year' + (interval === 1 ? '' : 's') + ' ago';
        }

        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) {
            return interval + ' month' + (interval === 1 ? '' : 's') + ' ago';
        }

        interval = Math.floor(seconds / 86400);
        if (interval >= 1) {
            return interval + ' day' + (interval === 1 ? '' : 's') + ' ago';
        }

        interval = Math.floor(seconds / 3600);
        if (interval >= 1) {
            return interval + ' hour' + (interval === 1 ? '' : 's') + ' ago';
        }

        interval = Math.floor(seconds / 60);
        if (interval >= 1) {
            return interval + ' minute' + (interval === 1 ? '' : 's') + ' ago';
        }

        return Math.floor(seconds) + ' second' + (seconds === 1 ? '' : 's') + ' ago';
    }
}

// Export singleton instance
const optionsUIController = new OptionsUIController();
export default optionsUIController;