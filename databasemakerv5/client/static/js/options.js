/**
 * Options data view controller
 * @module options
 */

import API from './api.js';
import { formatCurrency, formatPercentage, formatNumber } from './utils.js';
import App from './app.js';
import OptionsAnalytics from './options-analytics.js';
import OptionsStrategies from './options-strategies.js';

/**
 * Options data view controller
 */
const OptionsView = {
    /**
     * Current options data
     */
    currentOptionsData: null,

    /**
     * Current symbol being analyzed
     */
    currentSymbol: null,

    /**
     * Stock price data for the current symbol
     */
    stockData: null,

    /**
     * Initialize the options view
     */
    initialize: function() {
        // Set up event listeners
        this.setupEventListeners();

        // Initialize sub-modules
        OptionsAnalytics.initialize(this);
        OptionsStrategies.initialize(this);
    },

    /**
     * Set up event listeners
     */
    // Fix for the toggle button in options.js - Update setupEventListeners method
    setupEventListeners: function() {
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

        // Improved toggle button event handling - more direct and with debugging
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
                        OptionsAnalytics.updateAllCharts();
                    }
                } else {
                    console.error("Could not find advanced-analysis element!");
                }
            }
        });
    },

    /**
     * Load options data for a symbol
     * @param {string} symbol - Stock symbol
     * @param {boolean} includeGreeks - Whether to include Greeks
     */
    loadOptionsData: function(symbol, includeGreeks) {
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

                // Process and display options data
                this.displayOptionsData(data, symbol, includeGreeks);

                // Update analytics
                OptionsAnalytics.updateOptionsAnalytics(data, symbol);

                // Update implied move analysis if stock data is available
                if (this.stockData) {
                    OptionsAnalytics.updateImpliedMoveAnalysis();
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
    },

    /**
     * Load underlying stock data for the current symbol
     * @param {string} symbol - Stock symbol
     */
    loadUnderlyingData: function(symbol) {
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
                    const stockPriceElement = document.getElementById('current-stock-price');
                    if (stockPriceElement) {
                        stockPriceElement.textContent = formatCurrency(currentPrice);
                    }

                    const stockPriceContainer = document.getElementById('stock-price-container');
                    if (stockPriceContainer) {
                        stockPriceContainer.classList.remove('d-none');
                    }

                    // Calculate historical volatility
                    const historicalVolatility = OptionsAnalytics.calculateHistoricalVolatility(data);
                    const histVolElement = document.getElementById('historical-volatility');
                    if (histVolElement) {
                        histVolElement.textContent = (historicalVolatility * 100).toFixed(2) + '%';
                    }

                    // Update implied move analysis if options data is available
                    if (this.currentOptionsData) {
                        OptionsAnalytics.updateImpliedMoveAnalysis();
                    }

                    // Highlight ATM options
                    this.highlightAtTheMoney(currentPrice);
                }
            })
            .catch(error => {
                console.error('Error loading stock data:', error);
                const stockPriceContainer = document.getElementById('stock-price-container');
                if (stockPriceContainer) {
                    stockPriceContainer.classList.add('d-none');
                }
            });
    },

    /**
     * Highlight at-the-money options
     * @param {number} currentPrice - Current stock price
     */
    highlightAtTheMoney: function(currentPrice) {
        // Find the closest strike to the current price
        const optionRows = document.querySelectorAll('.options-table tbody tr');
        let closestStrike = null;
        let minDiff = Infinity;

        optionRows.forEach(row => {
            const strikeCell = row.querySelector('.strike-price');
            if (strikeCell) {
                const strike = parseFloat(strikeCell.textContent);
                const diff = Math.abs(strike - currentPrice);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestStrike = strike;
                }
            }
        });

        // Highlight ATM and near-ATM strikes
        if (closestStrike !== null) {
            const atmThreshold = currentPrice * 0.05; // 5% range

            optionRows.forEach(row => {
                const strikeCell = row.querySelector('.strike-price');
                if (strikeCell) {
                    const strike = parseFloat(strikeCell.textContent);
                    const diff = Math.abs(strike - currentPrice);

                    if (strike === closestStrike) {
                        // Exact ATM
                        row.classList.add('table-primary');
                        strikeCell.classList.add('bg-primary', 'text-white');
                    } else if (diff <= atmThreshold) {
                        // Near ATM
                        row.classList.add('table-info');
                    }
                }
            });
        }
    },

    /**
     * Initialize UI components from templates
     */
    initializeUIComponents: function() {
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

        // Set up filtering event listeners
        document.addEventListener('change', (e) => {
            if (e.target.id === 'filter-moneyness' || e.target.id === 'filter-min-volume') {
                this.applyFilters();
            }
        });
    },

    /**
     * Apply filters to the options display
     */
    // Add this to the OptionsView object in options.js
    applyFilters: function() {
        console.log("Applying options filters");

        const filterMoneynessEl = document.getElementById('filter-moneyness');
        const filterVolumeEl = document.getElementById('filter-min-volume');
        const filterOIEl = document.getElementById('filter-min-oi');

        if (!filterMoneynessEl || !filterVolumeEl || !filterOIEl) {
            console.error("Filter elements not found");
            return;
        }

        const moneynessFilter = filterMoneynessEl.value;
        const minVolumeFilter = parseInt(filterVolumeEl.value) || 0;
        const minOIFilter = parseInt(filterOIEl.value) || 0;

        console.log(`Applying filters: Moneyness=${moneynessFilter}, MinVolume=${minVolumeFilter}, MinOI=${minOIFilter}`);

        // Get all option rows
        const optionRows = document.querySelectorAll('#options-tabs-content table tr:not(:first-child)');
        console.log(`Found ${optionRows.length} option rows to filter`);

        // Current stock price
        const stockPriceEl = document.getElementById('current-stock-price');
        if (!stockPriceEl) {
            console.error("Stock price element not found");
            return;
        }

        const currentPrice = parseFloat(stockPriceEl.textContent.replace(/[^0-9.]/g, ''));
        console.log(`Current stock price: ${currentPrice}`);

        let visibleRows = 0;

        optionRows.forEach(row => {
            let show = true;

            // Get strike price from the row
            const strikeCell = row.querySelector('td.strike-price');
            if (strikeCell) {
                const strike = parseFloat(strikeCell.textContent);

                // Apply moneyness filter
                if (moneynessFilter !== 'all' && currentPrice) {
                    const moneyness = strike / currentPrice;

                    if (moneynessFilter === 'itm-calls' && row.classList.contains('call-row') && strike >= currentPrice) {
                        show = false;
                    } else if (moneynessFilter === 'otm-calls' && row.classList.contains('call-row') && strike < currentPrice) {
                        show = false;
                    } else if (moneynessFilter === 'itm-puts' && row.classList.contains('put-row') && strike <= currentPrice) {
                        show = false;
                    } else if (moneynessFilter === 'otm-puts' && row.classList.contains('put-row') && strike > currentPrice) {
                        show = false;
                    } else if (moneynessFilter === 'atm' && (moneyness < 0.95 || moneyness > 1.05)) {
                        show = false;
                    }
                }

                // Apply volume filter
                const volumeCell = row.querySelector('td.volume');
                if (volumeCell && minVolumeFilter > 0) {
                    const volume = parseInt(volumeCell.textContent.replace(/[^0-9]/g, '')) || 0;
                    if (volume < minVolumeFilter) {
                        show = false;
                    }
                }

                // Apply OI filter
                if (minOIFilter > 0) {
                    const oiCell = row.cells[row.cells.length - 7]; // Assuming OI is 7th from the end
                    const oi = parseInt(oiCell.textContent.replace(/[^0-9]/g, '')) || 0;
                    if (oi < minOIFilter) {
                        show = false;
                    }
                }
            }

            // Show or hide the row
            row.style.display = show ? '' : 'none';
            if (show) visibleRows++;
        });

        console.log(`Filtering complete. ${visibleRows} rows visible out of ${optionRows.length}`);
    },

    /**
     * Display options data in tables
     * @param {Array} optionsData - Options data
     * @param {string} symbol - Stock symbol
     * @param {boolean} includeGreeks - Whether Greeks are included
     */
    displayOptionsData: function(optionsData, symbol, includeGreeks) {
        // Group options by expiration date
        const optionsByExpiration = {};

        optionsData.forEach(option => {
            const expDate = option.expiration_date;
            if (!optionsByExpiration[expDate]) {
                optionsByExpiration[expDate] = [];
            }
            optionsByExpiration[expDate].push(option);
        });

        // Sort expiration dates
        const expirationDates = Object.keys(optionsByExpiration).sort();

        // Create tabs for each expiration date
        const tabsUl = document.getElementById('options-tabs');
        tabsUl.innerHTML = `
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="all-tab" data-bs-toggle="tab" data-bs-target="#all-options" type="button" role="tab">All Expirations</button>
            </li>
        `;

        // Create tab content container if it doesn't exist
        let tabsContent = document.getElementById('options-tabs-content');
        if (!tabsContent) {
            console.error('options-tabs-content element not found');
            return;
        }

        // Clear existing content
        tabsContent.innerHTML = '';

        let allOptionsHtml = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4>${symbol} Options</h4>
                <div class="d-flex">
                    <div id="stock-price-container" class="me-3 d-none">
                        <span class="fw-bold">Current Price:</span>
                        <span id="current-stock-price" class="text-primary fw-bold">$0.00</span>
                    </div>
                    <button class="btn btn-primary" id="toggle-advanced">Show Advanced Analysis</button>
                </div>
            </div>
        `;

        // Create all-options tab pane
        const allOptionsPane = document.createElement('div');
        allOptionsPane.className = 'tab-pane fade show active';
        allOptionsPane.id = 'all-options';
        allOptionsPane.role = 'tabpanel';
        allOptionsPane.innerHTML = allOptionsHtml;
        tabsContent.appendChild(allOptionsPane);

        // Re-initialize UI components
        this.initializeUIComponents();

        // Generate tabs and content for each expiration date
        expirationDates.forEach((expDate, index) => {
            const options = optionsByExpiration[expDate];
            const tabId = `exp-${expDate.replace(/[\/\s]/g, '-')}`;
            const formattedDate = this.formatDate(expDate);

            // Add tab
            const tabLi = document.createElement('li');
            tabLi.className = 'nav-item';
            tabLi.role = 'presentation';
            tabLi.innerHTML = `
                <button class="nav-link" id="${tabId}-tab" data-bs-toggle="tab" data-bs-target="#${tabId}" type="button" role="tab">
                    ${formattedDate}
                </button>
            `;
            tabsUl.appendChild(tabLi);

            // Create options table for this expiration
            const optionsTable = this.createEnhancedOptionsTable(options, includeGreeks, symbol);

            // Add tab content
            const tabPane = document.createElement('div');
            tabPane.className = 'tab-pane fade';
            tabPane.id = tabId;
            tabPane.role = 'tabpanel';

            const tabContent = document.createElement('div');
            tabContent.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4>${symbol} Options - Expiration: ${formattedDate}</h4>
                    <div id="expiry-countdown" class="badge bg-dark"></div>
                </div>
            `;
            tabContent.appendChild(optionsTable);

            tabPane.appendChild(tabContent);
            tabsContent.appendChild(tabPane);

            // Add to all options view (limited to first 3 expirations)
            if (index < 3) {
                const allOptionsSection = document.createElement('div');
                allOptionsSection.innerHTML = `
                    <h5 class="mt-4 bg-light p-2 rounded">Expiration: ${formattedDate}</h5>
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

        // Initialize tabs
        this.initializeOptionsTabs();

        // Apply highlight to ATM options if the stock price is available
        if (this.stockData) {
            const currentPrice = this.stockData[this.stockData.length - 1].close;
            this.highlightAtTheMoney(currentPrice);
        }
    },

    /**
     * Initialize options tabs
     */
    initializeOptionsTabs: function() {
        const tabButtons = document.querySelectorAll('#options-tabs .nav-link');

        tabButtons.forEach(tabButton => {
            tabButton.addEventListener('click', function(event) {
                event.preventDefault();

                // Remove active class from all tabs
                tabButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });

                // Add active class to clicked tab
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                // Hide all tab panes
                const tabPanes = document.querySelectorAll('#options-tabs-content .tab-pane');
                tabPanes.forEach(pane => {
                    pane.classList.remove('show', 'active');
                });

                // Show the target tab pane
                const targetPaneId = this.getAttribute('data-bs-target');
                const targetPane = document.querySelector(targetPaneId);
                if (targetPane) {
                    targetPane.classList.add('show', 'active');
                }

                // Update analytics for the selected expiration
                if (OptionsView.currentOptionsData && OptionsView.stockData) {
                    OptionsAnalytics.updateImpliedMoveAnalysis();
                    OptionsAnalytics.updateVolatilitySkewChart();
                    OptionsAnalytics.updateOptionsVolumeChart();
                }
            });
        });

        // Ensure the default tab is active
        const defaultTab = document.querySelector('#options-tabs .nav-link.active');
        if (defaultTab) {
            defaultTab.click();
        }
    },

    /**
     * Create enhanced options table with institutional-grade features
     * @param {Array} options - Options data
     * @param {boolean} includeGreeks - Whether to include Greeks
     * @param {string} symbol - Stock symbol
     * @returns {HTMLTableElement} - Options table
     */
    createEnhancedOptionsTable: function(options, includeGreeks, symbol) {
        // Separate calls and puts
        const calls = options.filter(o => o.contract_type === 'call');
        const puts = options.filter(o => o.contract_type === 'put');

        // Sort by strike price
        calls.sort((a, b) => a.strike_price - b.strike_price);
        puts.sort((a, b) => a.strike_price - b.strike_price);

        // Create table
        const table = document.createElement('table');
        table.className = 'table table-sm table-striped table-hover options-table';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.className = 'bg-dark text-white';

        // Call columns
        const callColumns = ['Last', 'Change', 'Bid', 'Ask', 'Vol', 'OI'];
        if (includeGreeks) {
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
        if (includeGreeks) {
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

        // Create rows for each strike price
        const allStrikes = [...new Set([...calls.map(c => c.strike_price), ...puts.map(p => p.strike_price)])];
        allStrikes.sort((a, b) => a - b);

        allStrikes.forEach(strike => {
            const row = document.createElement('tr');
            row.setAttribute('data-strike', strike);

            // Find matching call and put
            const call = calls.find(c => c.strike_price === strike);
            const put = puts.find(p => p.strike_price === strike);

            // Call data
            if (call) {
                row.classList.add('call-row');
                this.addEnhancedOptionCells(row, call, callColumns, 'call');
            } else {
                // Empty cells for missing call
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

            // Put data
            if (put) {
                row.classList.add('put-row');
                this.addEnhancedOptionCells(row, put, putColumns, 'put');
            } else {
                // Empty cells for missing put
                putColumns.forEach(() => {
                    const td = document.createElement('td');
                    row.appendChild(td);
                });
            }

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        return table;
    },

    /**
     * Add enhanced option data cells to a row
     * @param {HTMLTableRowElement} row - Table row
     * @param {Object} option - Option data
     * @param {Array} columns - Column names
     * @param {string} type - Option type
     */
    addEnhancedOptionCells: function(row, option, columns, type) {
        // Color coding based on option type
        const cellClass = type === 'call' ? 'call-cell' : 'put-cell';

        columns.forEach(col => {
            const td = document.createElement('td');
            td.className = `text-end px-2 ${cellClass}`;

            switch (col) {
                case 'Last':
                    td.textContent = formatCurrency(option.last_price);
                    td.className += ' fw-bold';

                    // Make the cell clickable to show option details
                    td.style.cursor = 'pointer';
                    td.setAttribute('data-bs-toggle', 'tooltip');
                    td.setAttribute('data-bs-title', `${option.contract_name}`);
                    td.addEventListener('click', () => this.showOptionDetails(option));
                    break;
                case 'Change':
                    const changeValue = option.change || 0;
                    td.textContent = `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}`;
                    td.className += changeValue >= 0 ? ' text-success' : ' text-danger';
                    break;
                case 'Bid':
                    td.textContent = formatCurrency(option.bid);
                    break;
                case 'Ask':
                    td.textContent = formatCurrency(option.ask);
                    const spread = option.ask - option.bid;
                    const spreadPct = option.bid > 0 ? (spread / option.bid) * 100 : 0;

                    // Highlight wide spreads
                    if (spreadPct > 20) {
                        td.className += ' text-danger';
                        td.setAttribute('data-bs-toggle', 'tooltip');
                        td.setAttribute('data-bs-title', `Wide spread: ${spreadPct.toFixed(1)}%`);
                    }
                    break;
                case 'Vol':
                    td.textContent = formatNumber(option.volume);
                    td.className += ' volume';

                    // Highlight high volume
                    if (option.volume > 1000) {
                        td.className += ' text-primary fw-bold';
                    }
                    break;
                case 'OI':
                    td.textContent = formatNumber(option.open_interest);

                    // Highlight high open interest
                    if (option.open_interest > 5000) {
                        td.className += ' text-primary fw-bold';
                    }
                    break;
                case 'IV':
                    if (option.implied_volatility !== undefined) {
                        const ivValue = option.implied_volatility * 100;
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
                        td.textContent = option.delta.toFixed(3);

                        // Highlight extreme deltas
                        const absValue = Math.abs(option.delta);
                        if (absValue > 0.9) {
                            td.className += ' text-danger';
                        }
                    } else {
                        td.textContent = '-';
                    }
                    break;
                case 'Gamma':
                    if (option.gamma !== undefined) {
                        td.textContent = option.gamma.toFixed(4);

                        // Highlight high gamma
                        if (option.gamma > 0.05) {
                            td.className += ' text-warning fw-bold';
                        }
                    } else {
                        td.textContent = '-';
                    }
                    break;
                case 'Theta':
                    if (option.theta !== undefined) {
                        td.textContent = option.theta.toFixed(4);

                        // Highlight high negative theta
                        if (option.theta < -0.01) {
                            td.className += ' text-danger';
                        }
                    } else {
                        td.textContent = '-';
                    }
                    break;
                case 'Vega':
                    if (option.vega !== undefined) {
                        td.textContent = option.vega.toFixed(4);

                        // Highlight high vega
                        if (option.vega > 0.1) {
                            td.className += ' text-info';
                        }
                    } else {
                        td.textContent = '-';
                    }
                    break;
            }

            row.appendChild(td);
        });
    },

    /**
     * Show detailed information about an option contract
     * @param {Object} option - Option data
     */
    // Update the showOptionDetails method in options.js
    showOptionDetails: function(option) {
        console.log("Showing option details:", option);

        // Calculate additional metrics
        const spread = option.ask - option.bid;
        const spreadPct = option.bid > 0 ? (spread / option.bid) * 100 : 0;

        // Get template or create new modal
        let modalElement = document.getElementById('optionDetailsModal');

        if (!modalElement) {
            // Use template if available
            const modalTemplate = document.getElementById('option-details-modal-template');
            if (modalTemplate) {
                document.body.appendChild(modalTemplate.content.cloneNode(true));
                modalElement = document.getElementById('optionDetailsModal');
                console.log("Created modal from template");
            } else {
                console.error("Option details modal template not found!");
                return;
            }
        }

        // Set the modal title
        const modalTitle = modalElement.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = `${option.contract_name || option.contract_type.toUpperCase() + ' ' + option.strike_price}`;
        }

        // Format currency
        const formatCurrency = (value) => {
            return '$' + parseFloat(value).toFixed(2);
        };

        // Format number
        const formatNumber = (value) => {
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        // Helper to update an element's text
        const updateElementText = (id, text) => {
            const element = modalElement.querySelector(`#${id}`);
            if (element) {
                element.textContent = text;
            }
        };

        // Populate modal data
        updateElementText('modal-symbol', this.currentSymbol);
        updateElementText('modal-contract-type', option.contract_type.toUpperCase());
        updateElementText('modal-strike', formatCurrency(option.strike_price));
        updateElementText('modal-expiration', this.formatDate(option.expiration_date));
        updateElementText('modal-last-price', formatCurrency(option.last_price));
        updateElementText('modal-bid', formatCurrency(option.bid));
        updateElementText('modal-ask', formatCurrency(option.ask));
        updateElementText('modal-spread', formatCurrency(spread) + ` (${spreadPct.toFixed(1)}%)`);
        updateElementText('modal-contract-value', formatCurrency(option.last_price * 100));
        updateElementText('modal-volume', formatNumber(option.volume));
        updateElementText('modal-open-interest', formatNumber(option.open_interest));

        const volumeOIRatio = option.open_interest > 0 ?
            (option.volume / option.open_interest).toFixed(2) : 'N/A';
        updateElementText('modal-volume-oi-ratio', volumeOIRatio);

        // Greeks
        updateElementText('modal-iv', option.implied_volatility ?
            (option.implied_volatility * 100).toFixed(2) + '%' : 'N/A');
        updateElementText('modal-delta', option.delta ?
            option.delta.toFixed(4) : 'N/A');
        updateElementText('modal-gamma', option.gamma ?
            option.gamma.toFixed(4) : 'N/A');
        updateElementText('modal-theta', option.theta ?
            option.theta.toFixed(4) : 'N/A');
        updateElementText('modal-vega', option.vega ?
            option.vega.toFixed(4) : 'N/A');

        // Initialize the modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        // Add event listeners for action buttons
        document.getElementById('option-analyze-btn')?.addEventListener('click', () => {
            if (this.optionsStrategies) {
                this.optionsStrategies.analyzeOptionProfitLoss(option);
                modal.hide();
            } else {
                console.error("Options strategies module not initialized");
            }
        });

        document.getElementById('option-add-strategy-btn')?.addEventListener('click', () => {
            if (this.optionsStrategies) {
                this.optionsStrategies.addToCustomStrategy(option);
                modal.hide();
            } else {
                console.error("Options strategies module not initialized");
            }
        });
    },

    /**
     * Find the strike price closest to the current price
     * @param {number} currentPrice - Current stock price
     * @param {Array} options - Array of option contracts
     * @returns {number} - Closest strike price
     */
    findClosestStrike: function(currentPrice, options) {
        // Get unique strike prices
        const strikes = [...new Set(options.map(opt => opt.strike_price))];

        // Find the closest strike
        let closestStrike = strikes[0];
        let minDiff = Math.abs(strikes[0] - currentPrice);

        strikes.forEach(strike => {
            const diff = Math.abs(strike - currentPrice);
            if (diff < minDiff) {
                minDiff = diff;
                closestStrike = strike;
            }
        });

        return closestStrike;
    },

    /**
     * Format date string
     * @param {string} dateStr - Date string
     * @returns {string} - Formatted date
     */
    formatDate: function(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
};

export default OptionsView;