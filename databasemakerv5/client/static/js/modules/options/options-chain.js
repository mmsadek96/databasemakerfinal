/**
 * Options Chain Module
 * Responsible for displaying and managing the options chain data
 */
class OptionsChainModule {
    /**
     * Constructor
     * @param {Object} optionsView - Reference to the main options view
     */
    constructor(optionsView) {
        this.optionsView = optionsView;
    }

    /**
     * Initialize the options chain module
     */
    initialize() {
        console.log("Options Chain Module initialized");
    }

    /**
     * Display options data in tables
     * @param {Array} optionsData - Options data from API
     * @param {string} symbol - Stock symbol
     * @param {boolean} includeGreeks - Whether to include Greeks
     */
    displayOptionsData(optionsData, symbol, includeGreeks) {
        // Store the data for reference
        this.optionsData = optionsData;
        this.symbol = symbol;
        this.includeGreeks = includeGreeks;

        console.log(`Displaying options data for ${symbol}:`, optionsData.length, "contracts");

        // Group options by expiration date
        const optionsByExpiration = this.groupOptionsByExpiration(optionsData);

        // Sort expiration dates
        const expirationDates = Object.keys(optionsByExpiration).sort();
        console.log("Found expiration dates:", expirationDates);

        // Create tabs for each expiration date
        this.createExpirationTabs(expirationDates);

        // Create tab content
        this.createTabContent(optionsByExpiration, expirationDates, symbol);

        // Initialize tabs behavior
        this.initializeOptionsTabs();
    }

    /**
     * Group options by expiration date
     * @param {Array} optionsData - Options data
     * @returns {Object} - Options grouped by expiration date
     */
    groupOptionsByExpiration(optionsData) {
        const optionsByExpiration = {};

        optionsData.forEach(option => {
            const expDate = option.expiration_date;
            if (!optionsByExpiration[expDate]) {
                optionsByExpiration[expDate] = [];
            }
            optionsByExpiration[expDate].push(option);
        });

        return optionsByExpiration;
    }

    /**
     * Create tabs for expiration dates
     * @param {Array} expirationDates - Sorted expiration dates
     */
    createExpirationTabs(expirationDates) {
        const tabsUl = document.getElementById('options-tabs');
        if (!tabsUl) {
            console.error('options-tabs element not found');
            return;
        }

        tabsUl.innerHTML = `
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="all-tab" data-bs-toggle="tab" data-bs-target="#all-options" type="button" role="tab">All Expirations</button>
            </li>
        `;

        // Generate tabs for each expiration date
        expirationDates.forEach(expDate => {
            const tabId = `exp-${expDate.replace(/[\/\s]/g, '-')}`;
            const formattedDate = this.optionsView.formatDate(expDate);

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
        });
    }

    /**
     * Create tab content for each expiration date
     * @param {Object} optionsByExpiration - Options grouped by expiration
     * @param {Array} expirationDates - Sorted expiration dates
     * @param {string} symbol - Stock symbol
     */
    createTabContent(optionsByExpiration, expirationDates, symbol) {
        let tabsContent = document.getElementById('options-tabs-content');
        if (!tabsContent) {
            console.error('options-tabs-content element not found');
            return;
        }

        // Clear existing content
        tabsContent.innerHTML = '';

        // Create all-options tab pane
        const allOptionsPane = document.createElement('div');
        allOptionsPane.className = 'tab-pane fade show active';
        allOptionsPane.id = 'all-options';
        allOptionsPane.role = 'tabpanel';

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

        allOptionsPane.innerHTML = allOptionsHtml;
        tabsContent.appendChild(allOptionsPane);

        // Generate tabs and content for each expiration date
        expirationDates.forEach((expDate, index) => {
            const options = optionsByExpiration[expDate];
            const tabId = `exp-${expDate.replace(/[\/\s]/g, '-')}`;
            const formattedDate = this.optionsView.formatDate(expDate);

            // Create options table for this expiration
            const optionsTable = this.createEnhancedOptionsTable(options, this.includeGreeks, symbol);

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
    }

    /**
     * Initialize options tabs behavior
     */
    initializeOptionsTabs() {
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
                if (this.optionsView && this.optionsView.currentOptionsData && this.optionsView.stockData) {
                    this.optionsView.analyticsModule.updateImpliedMoveAnalysis();
                    this.optionsView.chartsModule.updateVolatilitySkewChart();
                    this.optionsView.chartsModule.updateOptionsVolumeChart();
                }
            });
        });

        // Ensure the default tab is active
        const defaultTab = document.querySelector('#options-tabs .nav-link.active');
        if (defaultTab) {
            defaultTab.click();
        }
    }

    /**
     * Create enhanced options table with institutional-grade features
     * @param {Array} options - Options data
     * @param {boolean} includeGreeks - Whether to include Greeks
     * @param {string} symbol - Stock symbol
     * @returns {HTMLTableElement} - Options table
     */
    createEnhancedOptionsTable(options, includeGreeks, symbol) {
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
    }

    /**
     * Add enhanced option data cells to a row
     * @param {HTMLTableRowElement} row - Table row
     * @param {Object} option - Option data
     * @param {Array} columns - Column names
     * @param {string} type - Option type
     */
    addEnhancedOptionCells(row, option, columns, type) {
        // Color coding based on option type
        const cellClass = type === 'call' ? 'call-cell' : 'put-cell';

        columns.forEach(col => {
            const td = document.createElement('td');
            td.className = `text-end px-2 ${cellClass}`;

            switch (col) {
                case 'Last':
                    td.textContent = this.formatCurrency(option.last_price);
                    td.className += ' fw-bold';

                    // Make the cell clickable to show option details
                    td.style.cursor = 'pointer';
                    td.setAttribute('data-bs-toggle', 'tooltip');
                    td.setAttribute('data-bs-title', `${option.contract_name}`);
                    td.addEventListener('click', () => this.optionsView.detailModule.showOptionDetails(option));
                    break;
                case 'Change':
                    const changeValue = option.change || 0;
                    td.textContent = `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}`;
                    td.className += changeValue >= 0 ? ' text-success' : ' text-danger';
                    break;
                case 'Bid':
                    td.textContent = this.formatCurrency(option.bid);
                    break;
                case 'Ask':
                    td.textContent = this.formatCurrency(option.ask);
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
                    td.textContent = this.formatNumber(option.volume);
                    td.className += ' volume';

                    // Highlight high volume
                    if (option.volume > 1000) {
                        td.className += ' text-primary fw-bold';
                    }
                    break;
                case 'OI':
                    td.textContent = this.formatNumber(option.open_interest);

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
    }

    /**
     * Highlight at-the-money options
     * @param {number} currentPrice - Current stock price
     */
    highlightAtTheMoney(currentPrice) {
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
    }

    /**
     * Set up filtering event listeners
     */
    setupFilterEventListeners() {
        document.addEventListener('change', (e) => {
            if (e.target.id === 'filter-moneyness' ||
                e.target.id === 'filter-min-volume' ||
                e.target.id === 'filter-min-oi') {
                this.applyFilters();
            }
        });
    }

    /**
     * Apply filters to the options display
     */
    applyFilters() {
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

    /**
     * Format number with commas
     * @param {number} value - Value to format
     * @returns {string} - Formatted string
     */
    formatNumber(value) {
        if (value === undefined || value === null) return 'N/A';
        return new Intl.NumberFormat().format(value);
    }
}

export { OptionsChainModule };
