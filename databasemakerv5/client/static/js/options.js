/**
 * Options data view controller
 * @module options
 */

import API from './api.js';
import { formatCurrency, formatPercentage, formatNumber } from './utils.js';
import App from './app.js';

/**
 * Options data view controller
 */
const OptionsView = {
    /**
     * Initialize the options view
     */
    initialize: function() {
        // Set up event listeners
        this.setupEventListeners();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Load options data button
        document.getElementById('load-options-button').addEventListener('click', () => {
            const symbol = document.getElementById('options-symbol').value.trim().toUpperCase();
            const includeGreeks = document.getElementById('include-greeks').checked;

            if (symbol) {
                this.loadOptionsData(symbol, includeGreeks);
            }
        });

        // Options symbol on Enter key
        document.getElementById('options-symbol').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('load-options-button').click();
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

        API.getOptionsData(symbol, includeGreeks)
            .then(data => {
                if (!data || data.length === 0) {
                    throw new Error('No options data available for this symbol');
                }

                // Process and display options data
                this.displayOptionsData(data, symbol, includeGreeks);
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
            });
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

        // Create tab content
        const tabsContent = document.getElementById('options-tabs-content');
        tabsContent.innerHTML = ''; // Clear existing content

        let allOptionsHtml = `<h4 class="mb-3">${symbol} Options</h4>`;

        // Create all-options tab pane
        const allOptionsPane = document.createElement('div');
        allOptionsPane.className = 'tab-pane fade show active';
        allOptionsPane.id = 'all-options';
        allOptionsPane.role = 'tabpanel';
        tabsContent.appendChild(allOptionsPane);

        // Generate tabs and content for each expiration date
        expirationDates.forEach((expDate, index) => {
            const options = optionsByExpiration[expDate];
            const tabId = `exp-${expDate.replace(/\//g, '-').replace(/\s/g, '')}`;

            // Add tab
            const tabLi = document.createElement('li');
            tabLi.className = 'nav-item';
            tabLi.role = 'presentation';
            tabLi.innerHTML = `
                <button class="nav-link" id="${tabId}-tab" data-bs-toggle="tab" data-bs-target="#${tabId}" type="button" role="tab">
                    ${this.formatDate(expDate)}
                </button>
            `;
            tabsUl.appendChild(tabLi);

            // Create options table for this expiration
            const optionsTable = this.createOptionsTable(options, includeGreeks);

            // Add tab content
            const tabPane = document.createElement('div');
            tabPane.className = 'tab-pane fade';
            tabPane.id = tabId;
            tabPane.role = 'tabpanel';

            const tabContent = document.createElement('div');
            tabContent.innerHTML = `
                <h4 class="mb-3">${symbol} Options - Expiration: ${this.formatDate(expDate)}</h4>
            `;
            tabContent.appendChild(optionsTable);

            tabPane.appendChild(tabContent);
            tabsContent.appendChild(tabPane);

            // Add to all options view (limited to first 3 expirations)
            if (index < 3) {
                allOptionsHtml += `
                    <h5 class="mt-4">Expiration: ${this.formatDate(expDate)}</h5>
                    <div class="table-responsive">
                        ${optionsTable.outerHTML}
                    </div>
                `;
            }
        });

        // If there are more than 3 expirations, add a note
        if (expirationDates.length > 3) {
            allOptionsHtml += `
                <div class="alert alert-info mt-3">
                    <i class="bi bi-info-circle"></i> 
                    Showing options for the first 3 expiration dates. 
                    Use the tabs above to view all available expiration dates.
                </div>
            `;
        }

        // Update all options tab content
        document.getElementById('all-options').innerHTML = allOptionsHtml;

        // Initialize tabs
        this.initializeOptionsTabs();
    },

    /**
     * Initialize options tabs
     */
    initializeOptionsTabs: function() {
        document.querySelectorAll('#options-tabs .nav-link').forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs
                document.querySelectorAll('#options-tabs .nav-link').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });

                // Add active class to clicked tab
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                // Hide all tab panes
                document.querySelectorAll('#options-tabs-content .tab-pane').forEach(pane => {
                    pane.classList.remove('show', 'active');
                });

                // Show corresponding tab pane
                const target = this.getAttribute('data-bs-target');
                document.querySelector(target).classList.add('show', 'active');
            });
        });
    },

    /**
     * Create options table
     * @param {Array} options - Options data
     * @param {boolean} includeGreeks - Whether to include Greeks
     * @returns {HTMLTableElement} - Options table
     */
    createOptionsTable: function(options, includeGreeks) {
        // Separate calls and puts
        const calls = options.filter(o => o.contract_type === 'call');
        const puts = options.filter(o => o.contract_type === 'put');

        // Sort by strike price
        calls.sort((a, b) => a.strike_price - b.strike_price);
        puts.sort((a, b) => a.strike_price - b.strike_price);

        // Create table
        const table = document.createElement('table');
        table.className = 'table table-sm table-hover options-table';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Call columns
        const callColumns = ['Last', 'Change', 'Bid', 'Ask', 'Vol', 'OI'];
        if (includeGreeks) {
            callColumns.push('IV', 'Delta', 'Gamma', 'Theta', 'Vega');
        }

        callColumns.forEach(col => {
            const th = document.createElement('th');
            th.className = 'text-end';
            th.textContent = col;
            headerRow.appendChild(th);
        });

        // Strike column
        const strikeHeader = document.createElement('th');
        strikeHeader.className = 'text-center bg-light';
        strikeHeader.textContent = 'Strike';
        headerRow.appendChild(strikeHeader);

        // Put columns
        const putColumns = ['Last', 'Change', 'Bid', 'Ask', 'Vol', 'OI'];
        if (includeGreeks) {
            putColumns.push('IV', 'Delta', 'Gamma', 'Theta', 'Vega');
        }

        putColumns.forEach(col => {
            const th = document.createElement('th');
            th.className = 'text-end';
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

            // Find matching call and put
            const call = calls.find(c => c.strike_price === strike);
            const put = puts.find(p => p.strike_price === strike);

            // Call data
            if (call) {
                this.addOptionCells(row, call, callColumns, 'call');
            } else {
                // Empty cells for missing call
                callColumns.forEach(() => {
                    const td = document.createElement('td');
                    row.appendChild(td);
                });
            }

            // Strike cell
            const strikeCell = document.createElement('td');
            strikeCell.className = 'text-center bg-light fw-bold';
            strikeCell.textContent = strike.toFixed(2);
            row.appendChild(strikeCell);

            // Put data
            if (put) {
                this.addOptionCells(row, put, putColumns, 'put');
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
     * Add option data cells to a row
     * @param {HTMLTableRowElement} row - Table row
     * @param {Object} option - Option data
     * @param {Array} columns - Column names
     * @param {string} type - Option type
     */
    addOptionCells: function(row, option, columns, type) {
        columns.forEach(col => {
            const td = document.createElement('td');
            td.className = 'text-end';

            switch (col) {
                case 'Last':
                    td.textContent = formatCurrency(option.last_price);
                    break;
                case 'Change':
                    td.textContent = `${option.change >= 0 ? '+' : ''}${option.change.toFixed(2)}`;
                    td.className += option.change >= 0 ? ' text-success' : ' text-danger';
                    break;
                case 'Bid':
                    td.textContent = formatCurrency(option.bid);
                    break;
                case 'Ask':
                    td.textContent = formatCurrency(option.ask);
                    break;
                case 'Vol':
                    td.textContent = formatNumber(option.volume);
                    break;
                case 'OI':
                    td.textContent = formatNumber(option.open_interest);
                    break;
                case 'IV':
                    td.textContent = option.implied_volatility ?
                        (option.implied_volatility * 100).toFixed(1) + '%' : '-';
                    break;
                case 'Delta':
                    td.textContent = option.delta ? option.delta.toFixed(3) : '-';
                    break;
                case 'Gamma':
                    td.textContent = option.gamma ? option.gamma.toFixed(4) : '-';
                    break;
                case 'Theta':
                    td.textContent = option.theta ? option.theta.toFixed(4) : '-';
                    break;
                case 'Vega':
                    td.textContent = option.vega ? option.vega.toFixed(4) : '-';
                    break;
            }

            row.appendChild(td);
        });
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