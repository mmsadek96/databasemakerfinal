/**
 * Options Table Module
 * This file is responsible for displaying options data in a table
 */

// Create the Options Table handler
const OptionsTable = {
  // Properties
  symbol: '',
  processedData: null,
  expirationDates: [],
  currentExpiration: null,
  includeGreeks: true,
  strikesPerPage: 10, // Number of strikes to show per page
  currentPage: 1,     // Current page number
  stockPrice: 0,      // Current stock price for ITM/OTM calculation

  // Filter properties
  filterMin: null,      // Minimum strike filter
  filterMax: null,      // Maximum strike filter
  filterType: 'all',    // Filter type: 'all', 'calls', 'puts'
  filterMinVol: null,   // Minimum volume filter
  filterMinOI: null,    // Minimum open interest filter
  filterMoneyness: 'all', // 'all', 'itm', 'otm', 'atm'

  // Display options data
  displayOptions: function(symbol, data, includeGreeks = false) {
    console.log(`OptionsTable.displayOptions called for ${symbol} with ${data.length} contracts`);
    this.symbol = symbol;
    this.includeGreeks = includeGreeks;
    this.currentPage = 1; // Reset to page 1 when loading new data

    // Try to get stock price from controller or estimate it
    if (window.OptionsController && window.OptionsController.stockPrice) {
      this.stockPrice = window.OptionsController.stockPrice;
    } else {
      this.stockPrice = this.fetchRealStockPrice(data);
    }

    console.log(`Using stock price: ${this.stockPrice} for ${symbol}`);

    // Process the data
    this.processOptionsData(data);

    if (this.expirationDates.length === 0) {
      // No expirations found
      this.showError('No option expiration dates found for ' + symbol);
      return;
    }

    // Show the expiration selector
    const expirationSelector = document.getElementById('expiration-selector');
    if (expirationSelector) {
      expirationSelector.classList.remove('d-none');
    }

    // Update symbol display
    const symbolDisplay = document.getElementById('symbol-display');
    if (symbolDisplay) {
      symbolDisplay.textContent = symbol;
    }

    // Display the first expiration by default
    this.displayExpirationOptions(this.expirationDates[0]);
    this.populateExpirationSelect();
  },

  // Estimate stock price from option data
  fetchRealStockPrice: function(data) {

    if (window.OptionsController && window.OptionsController.stockPrice > 0) {
        return window.OptionsController.stockPrice;
    }
    if (!data || data.length === 0) return 0;
    // Use at-the-money options to estimate stock price
    // Group by strike price
    const strikeMap = {};

    data.forEach(option => {
      const strike = parseFloat(option.strike_price);
      const type = option.contract_type.toLowerCase();

      if (!strikeMap[strike]) {
        strikeMap[strike] = { call: null, put: null };
      }

      if (type === 'call' && !strikeMap[strike].call) {
        strikeMap[strike].call = option;
      } else if (type === 'put' && !strikeMap[strike].put) {
        strikeMap[strike].put = option;
      }
    });

    // Find strike with smallest price difference between call and put
    let bestStrike = 0;
    let smallestDiff = Infinity;

    Object.entries(strikeMap).forEach(([strike, pair]) => {
      if (pair.call && pair.put) {
        const callMid = (parseFloat(pair.call.bid) + parseFloat(pair.call.ask)) / 2;
        const putMid = (parseFloat(pair.put.bid) + parseFloat(pair.put.ask)) / 2;
        const diff = Math.abs(callMid - putMid);

        if (diff < smallestDiff) {
          smallestDiff = diff;
          bestStrike = parseFloat(strike);
        }
      }
    });

    return bestStrike || parseFloat(data[0].strike_price);
  },

  // Process options data
  processOptionsData: function(data) {
    console.log('Processing options data', data);
    if (!Array.isArray(data) || data.length === 0) {
      this.showError('No options data available');
      return;
    }

    // Group by expiration date
    const byExpiration = {};

    data.forEach(option => {
      const expDate = option.expiration_date;

      if (!byExpiration[expDate]) {
        byExpiration[expDate] = {
          calls: [],
          puts: []
        };
      }

      // Add to appropriate array based on type
      const contractType = option.contract_type.toLowerCase();
      if (contractType === 'call') {
        byExpiration[expDate].calls.push(option);
      } else if (contractType === 'put') {
        byExpiration[expDate].puts.push(option);
      }
    });

    console.log('Processed data by expiration:', byExpiration);

    // Sort options by strike price
    Object.keys(byExpiration).forEach(expDate => {
      byExpiration[expDate].calls.sort((a, b) =>
        parseFloat(a.strike_price) - parseFloat(b.strike_price)
      );

      byExpiration[expDate].puts.sort((a, b) =>
        parseFloat(a.strike_price) - parseFloat(b.strike_price)
      );
    });

    // Get expiration dates and sort chronologically
    this.expirationDates = Object.keys(byExpiration).sort();
    this.processedData = byExpiration;

    console.log('Found expiration dates:', this.expirationDates);
  },

  // Populate expiration select dropdown
  populateExpirationSelect: function() {
    const select = document.getElementById('expiration-select');
    if (!select) {
      console.error('Could not find expiration-select element');
      return;
    }

    // Clear existing options
    select.innerHTML = '';

    // Add an option for each date
    this.expirationDates.forEach(date => {
      const option = document.createElement('option');
      option.value = date;
      option.textContent = this.formatDateForDisplay(date);
      select.appendChild(option);
    });

    // Set up change event listener
    select.addEventListener('change', () => {
      this.currentPage = 1; // Reset to page 1 when changing expiration
      this.displayExpirationOptions(select.value);
    });

    console.log('Populated expiration select with', this.expirationDates.length, 'dates');
  },

  // Apply filters to the sorted strikes
  applyFilters: function(sortedStrikes, options) {
    // Start with all strikes
    let filteredStrikes = [...sortedStrikes];

    // Apply strike price range filter
    if (this.filterMin !== null) {
      filteredStrikes = filteredStrikes.filter(strike => strike >= this.filterMin);
    }

    if (this.filterMax !== null) {
      filteredStrikes = filteredStrikes.filter(strike => strike <= this.filterMax);
    }

    // Apply contract type filter
    if (this.filterType === 'calls') {
      filteredStrikes = filteredStrikes.filter(strike =>
        options.calls.some(call => parseFloat(call.strike_price) === strike)
      );
    } else if (this.filterType === 'puts') {
      filteredStrikes = filteredStrikes.filter(strike =>
        options.puts.some(put => parseFloat(put.strike_price) === strike)
      );
    }

    // Apply volume filter
    if (this.filterMinVol !== null) {
      filteredStrikes = filteredStrikes.filter(strike => {
        const call = options.calls.find(c => parseFloat(c.strike_price) === strike);
        const put = options.puts.find(p => parseFloat(p.strike_price) === strike);

        if (this.filterType === 'calls') {
          return call && parseInt(call.volume) >= this.filterMinVol;
        } else if (this.filterType === 'puts') {
          return put && parseInt(put.volume) >= this.filterMinVol;
        } else {
          return (call && parseInt(call.volume) >= this.filterMinVol) ||
                 (put && parseInt(put.volume) >= this.filterMinVol);
        }
      });
    }

    // Apply open interest filter
    if (this.filterMinOI !== null) {
      filteredStrikes = filteredStrikes.filter(strike => {
        const call = options.calls.find(c => parseFloat(c.strike_price) === strike);
        const put = options.puts.find(p => parseFloat(p.strike_price) === strike);

        if (this.filterType === 'calls') {
          return call && parseInt(call.open_interest) >= this.filterMinOI;
        } else if (this.filterType === 'puts') {
          return put && parseInt(put.open_interest) >= this.filterMinOI;
        } else {
          return (call && parseInt(call.open_interest) >= this.filterMinOI) ||
                 (put && parseInt(put.open_interest) >= this.filterMinOI);
        }
      });
    }

    // Apply moneyness filter
    if (this.filterMoneyness !== 'all' && this.stockPrice > 0) {
      filteredStrikes = filteredStrikes.filter(strike => {
        const isITM_Call = strike < this.stockPrice;
        const isITM_Put = strike > this.stockPrice;
        const isATM = Math.abs(strike - this.stockPrice) < (this.stockPrice * 0.02); // Within 2% of stock price

        if (this.filterMoneyness === 'itm') {
          if (this.filterType === 'calls') {
            return isITM_Call;
          } else if (this.filterType === 'puts') {
            return isITM_Put;
          } else {
            return isITM_Call || isITM_Put;
          }
        } else if (this.filterMoneyness === 'otm') {
          if (this.filterType === 'calls') {
            return !isITM_Call && !isATM;
          } else if (this.filterType === 'puts') {
            return !isITM_Put && !isATM;
          } else {
            return (!isITM_Call && !isATM) || (!isITM_Put && !isATM);
          }
        } else if (this.filterMoneyness === 'atm') {
          return isATM;
        }

        return true;
      });
    }

    return filteredStrikes;
  },

  // Reset all filters to default values
  resetFilters: function() {
    this.filterMin = null;
    this.filterMax = null;
    this.filterType = 'all';
    this.filterMinVol = null;
    this.filterMinOI = null;
    this.filterMoneyness = 'all';
    this.currentPage = 1; // Reset to first page when clearing filters
  },

  // Display options for a specific expiration date
  displayExpirationOptions: function(expirationDate) {
    console.log('Displaying options for expiration:', expirationDate);
    if (!this.processedData || !this.processedData[expirationDate]) {
      console.error('No processed data for expiration:', expirationDate);
      return;
    }

    const options = this.processedData[expirationDate];
    this.currentExpiration = expirationDate;

    // Get the container for the options table
    const container = document.getElementById('options-table-container');
    if (!container) {
      console.error('Could not find options-table-container element');
      return;
    }

    // Update expiration display
    const expirationDisplay = document.getElementById('current-expiration');
    if (expirationDisplay) {
      expirationDisplay.textContent = this.formatDateForDisplay(expirationDate);
    }

    // Get all unique strike prices
    const strikes = new Set();
    options.calls.forEach(call => strikes.add(parseFloat(call.strike_price)));
    options.puts.forEach(put => strikes.add(parseFloat(put.strike_price)));
    const sortedStrikes = Array.from(strikes).sort((a, b) => a - b);

    console.log('Found', sortedStrikes.length, 'unique strike prices');

    // Apply filters to strikes
    const filteredStrikes = this.applyFilters(sortedStrikes, options);
    console.log('After filtering:', filteredStrikes.length, 'strikes remain');

    // Calculate pagination
    const totalStrikes = filteredStrikes.length;
    const totalPages = Math.ceil(totalStrikes / this.strikesPerPage) || 1; // Ensure at least 1 page

    // Ensure current page is valid
    if (this.currentPage < 1) this.currentPage = 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    // Get strikes for current page
    const startIndex = (this.currentPage - 1) * this.strikesPerPage;
    const endIndex = Math.min(startIndex + this.strikesPerPage, totalStrikes);
    const currentPageStrikes = filteredStrikes.slice(startIndex, endIndex);

    // Add filter controls
    let filterControlsHtml = `
      <div class="card mb-3">
        <div class="card-header bg-light">
          <h6 class="mb-0 d-flex justify-content-between align-items-center">
            <span>Filter Options</span>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="reset-filters-btn">
              Reset Filters
            </button>
          </h6>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Strike Price Range</label>
              <div class="input-group">
                <input type="number" class="form-control form-control-sm" id="filter-min-strike" placeholder="Min" 
                  ${this.filterMin !== null ? `value="${this.filterMin}"` : ''}>
                <span class="input-group-text">to</span>
                <input type="number" class="form-control form-control-sm" id="filter-max-strike" placeholder="Max"
                  ${this.filterMax !== null ? `value="${this.filterMax}"` : ''}>
              </div>
            </div>
            <div class="col-md-4">
              <label class="form-label">Contract Type</label>
              <select class="form-select form-select-sm" id="filter-type">
                <option value="all" ${this.filterType === 'all' ? 'selected' : ''}>All Contracts</option>
                <option value="calls" ${this.filterType === 'calls' ? 'selected' : ''}>Calls Only</option>
                <option value="puts" ${this.filterType === 'puts' ? 'selected' : ''}>Puts Only</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Moneyness</label>
              <select class="form-select form-select-sm" id="filter-moneyness">
                <option value="all" ${this.filterMoneyness === 'all' ? 'selected' : ''}>All Strikes</option>
                <option value="itm" ${this.filterMoneyness === 'itm' ? 'selected' : ''}>In-the-Money</option>
                <option value="otm" ${this.filterMoneyness === 'otm' ? 'selected' : ''}>Out-of-the-Money</option>
                <option value="atm" ${this.filterMoneyness === 'atm' ? 'selected' : ''}>At-the-Money</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Minimum Volume</label>
              <input type="number" class="form-control form-control-sm" id="filter-min-volume" placeholder="Minimum volume"
                ${this.filterMinVol !== null ? `value="${this.filterMinVol}"` : ''}>
            </div>
            <div class="col-md-6">
              <label class="form-label">Minimum Open Interest</label>
              <input type="number" class="form-control form-control-sm" id="filter-min-oi" placeholder="Minimum open interest"
                ${this.filterMinOI !== null ? `value="${this.filterMinOI}"` : ''}>
            </div>
            <div class="col-12">
              <button type="button" class="btn btn-primary btn-sm w-100" id="apply-filters-btn">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // If no results after filtering, show message
    if (filteredStrikes.length === 0) {
      container.innerHTML = `
        ${filterControlsHtml}
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          No options match your filter criteria. Try adjusting the filters.
        </div>
      `;

      // Add event listeners for filter buttons
      this.setupFilterEventListeners(container, expirationDate);
      return;
    }

    // Generate header row based on whether we include Greeks
    let headerRow = `
      <tr>
        <th class="text-end">Last</th>
        <th class="text-end">Change</th>
        <th class="text-end">Bid</th>
        <th class="text-end">Ask</th>
        <th class="text-end">Volume</th>
        <th class="text-end">OI</th>
    `;

    if (this.includeGreeks) {
      headerRow += `
        <th class="text-end">IV</th>
        <th class="text-end">Delta</th>
        <th class="text-end">Gamma</th>
      `;
    }

    headerRow += `
        <th class="text-center bg-light">Strike</th>
    `;

    // Mirror the same columns for puts
    headerRow += `
        <th class="text-end">Last</th>
        <th class="text-end">Change</th>
        <th class="text-end">Bid</th>
        <th class="text-end">Ask</th>
        <th class="text-end">Volume</th>
        <th class="text-end">OI</th>
    `;

    if (this.includeGreeks) {
      headerRow += `
        <th class="text-end">IV</th>
        <th class="text-end">Delta</th>
        <th class="text-end">Gamma</th>
      `;
    }

    headerRow += `</tr>`;

    // Calculate the colspan for the top header
    const greekCols = this.includeGreeks ? 3 : 0;
    const callPutColspan = 6 + greekCols;

    // Generate the table HTML
    let tableHtml = `
      <table class="table table-sm table-hover options-table">
        <thead>
          <tr class="bg-dark text-white">
            <th colspan="${callPutColspan}" class="text-center">Calls</th>
            <th class="text-center bg-light text-dark">Strike</th>
            <th colspan="${callPutColspan}" class="text-center">Puts</th>
          </tr>
          ${headerRow}
        </thead>
        <tbody>
    `;

    // ATM approximation
    const atmStrike = this.findClosestStrike(sortedStrikes, this.stockPrice);
    const nearAtmThreshold = this.stockPrice * 0.02; // 2% of stock price

    // Add a row for each strike price on the current page
    currentPageStrikes.forEach(strike => {
      const call = options.calls.find(c => parseFloat(c.strike_price) === strike);
      const put = options.puts.find(p => parseFloat(p.strike_price) === strike);

      // Determine moneyness classes
      const isNearATM = Math.abs(strike - this.stockPrice) <= nearAtmThreshold;
      const isATM = strike === atmStrike;
      const isITM_Call = strike < this.stockPrice;
      const isITM_Put = strike > this.stockPrice;

      // Base row class
      let rowClass = isATM ? 'atm' : isNearATM ? 'near-atm' : '';

      // Display ITM/OTM information in the row
      tableHtml += `<tr class="${rowClass}">`;

      // Call cells - with ITM/OTM class
      const callClass = isITM_Call ? 'itm-call' : 'otm-call';
      tableHtml = this.addOptionCells(tableHtml, call, `call ${callClass}`);

      // Strike price cell - also add stock price indicator if this is ATM
      let strikeCellClass = 'text-center bg-light fw-bold strike-price';
      if (isATM) strikeCellClass += ' atm-strike';

      tableHtml += `
        <td class="${strikeCellClass}">
          ${this.formatCurrency(strike)}
          ${isATM ? '<span class="badge bg-info">ATM</span>' : ''}
        </td>
      `;

      // Put cells - with ITM/OTM class
      const putClass = isITM_Put ? 'itm-put' : 'otm-put';
      tableHtml = this.addOptionCells(tableHtml, put, `put ${putClass}`);

      tableHtml += '</tr>';
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    // Add pagination controls
    tableHtml += `
      <div class="d-flex justify-content-between align-items-center flex-wrap mt-3">
        <div>
          <span class="badge bg-primary">${this.symbol}</span>
          <span class="ms-2">Expiration: ${this.formatDateForDisplay(expirationDate)}</span>
          ${this.stockPrice > 0 ? `<span class="ms-2">Stock Price: ${this.formatCurrency(this.stockPrice)}</span>` : ''}
        </div>
        <div>
          <nav aria-label="Option chain pagination">
            <ul class="pagination pagination-sm">
              <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="1" aria-label="First">
                  <span aria-hidden="true">&laquo;&laquo;</span>
                </a>
              </li>
              <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}" aria-label="Previous">
                  <span aria-hidden="true">&laquo;</span>
                </a>
              </li>
    `;

    // Page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      tableHtml += `
        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    tableHtml += `
              <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}" aria-label="Next">
                  <span aria-hidden="true">&raquo;</span>
                </a>
              </li>
              <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${totalPages}" aria-label="Last">
                  <span aria-hidden="true">&raquo;&raquo;</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div>
          <span class="text-muted">
            Page ${this.currentPage} of ${totalPages} •
            ${filteredStrikes.length} of ${sortedStrikes.length} strikes • 
            ${options.calls.length} calls • 
            ${options.puts.length} puts
          </span>
        </div>
      </div>
    `;

    // Add page size selector
    tableHtml += `
      <div class="mt-2 d-flex align-items-center">
        <small class="text-muted me-2">Strikes per page:</small>
        <select class="form-select form-select-sm" style="width: auto;" id="page-size-select">
          <option value="5" ${this.strikesPerPage === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${this.strikesPerPage === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${this.strikesPerPage === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${this.strikesPerPage === 50 ? 'selected' : ''}>50</option>
        </select>
      </div>
    `;

    // Add legend for ITM/OTM
    tableHtml += `
      <div class="mt-3 options-legend">
        <div class="d-flex flex-wrap gap-3 justify-content-center">
          <div class="legend-item"><span class="legend-color itm-call-bg"></span> ITM Call</div>
          <div class="legend-item"><span class="legend-color otm-call-bg"></span> OTM Call</div>
          <div class="legend-item"><span class="legend-color atm-strike-bg"></span> ATM Strike</div>
          <div class="legend-item"><span class="legend-color itm-put-bg"></span> ITM Put</div>
          <div class="legend-item"><span class="legend-color otm-put-bg"></span> OTM Put</div>
        </div>
      </div>
    `;

    // Add custom CSS for ITM/OTM highlighting and legend
    tableHtml += `
      <style>
        .itm-call { background-color: rgba(40, 167, 69, 0.1); }
        .otm-call { background-color: rgba(40, 167, 69, 0.02); }
        .itm-put { background-color: rgba(220, 53, 69, 0.1); }
        .otm-put { background-color: rgba(220, 53, 69, 0.02); }
        .atm-strike { background-color: rgba(23, 162, 184, 0.2); }
        
        .options-legend {
          padding: 8px;
          border-radius: 4px;
          background-color: #f8f9fa;
        }
        .legend-item {
          display: flex;
          align-items: center;
          font-size: 0.875rem;
        }
        .legend-color {
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-right: 4px;
          border-radius: 3px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        .itm-call-bg { background-color: rgba(40, 167, 69, 0.1); }
        .otm-call-bg { background-color: rgba(40, 167, 69, 0.02); }
        .itm-put-bg { background-color: rgba(220, 53, 69, 0.1); }
        .otm-put-bg { background-color: rgba(220, 53, 69, 0.02); }
        .atm-strike-bg { background-color: rgba(23, 162, 184, 0.2); }
      </style>
    `;

    // Update the container with filter controls and table
    container.innerHTML = filterControlsHtml + tableHtml;

    // Setup filter event listeners
    this.setupFilterEventListeners(container, expirationDate);

    // Check if we have parity data to display
  if (this.parityData && this.parityData.length > 0) {
    this.updateTableWithParityData();
  }

  // Check if there's pending parity data to load
  if (window.pendingParityTableData) {
    this.parityData = window.pendingParityTableData;
    window.pendingParityTableData = null;
    this.updateTableWithParityData();
  }


    // Add event listeners to pagination links
    container.querySelectorAll('.pagination .page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(link.getAttribute('data-page'));
        if (page && page !== this.currentPage) {
          this.currentPage = page;
          this.displayExpirationOptions(expirationDate);
        }
      });
    });

    // Add event listener to page size selector
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', () => {
        this.strikesPerPage = parseInt(pageSizeSelect.value);
        this.currentPage = 1; // Reset to first page when changing page size
        this.displayExpirationOptions(expirationDate);
      });
    }

    // Show the container
    container.classList.remove('d-none');

    // Show the expiration details
    const expirationDetails = document.getElementById('expiration-details');
    if (expirationDetails) {
      expirationDetails.classList.remove('d-none');
    }

    console.log('Options table rendered successfully with pagination and filtering');
  },

  // Set up filter event listeners
  setupFilterEventListeners: function(container, expirationDate) {
    // Add filter button event listener
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => {
        // Get filter values
        const minStrike = document.getElementById('filter-min-strike').value;
        const maxStrike = document.getElementById('filter-max-strike').value;
        const filterType = document.getElementById('filter-type').value;
        const minVolume = document.getElementById('filter-min-volume').value;
        const minOI = document.getElementById('filter-min-oi').value;
        const moneyness = document.getElementById('filter-moneyness').value;

        // Update filter properties
        this.filterMin = minStrike ? parseFloat(minStrike) : null;
        this.filterMax = maxStrike ? parseFloat(maxStrike) : null;
        this.filterType = filterType;
        this.filterMinVol = minVolume ? parseInt(minVolume) : null;
        this.filterMinOI = minOI ? parseInt(minOI) : null;
        this.filterMoneyness = moneyness;

        // Reset to first page
        this.currentPage = 1;

        // Redisplay the options
        this.displayExpirationOptions(expirationDate);
      });
    }

    // Add reset filters button event listener
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        this.resetFilters();
        this.displayExpirationOptions(expirationDate);
      });
    }
  },

  // Find closest strike to a target price
  findClosestStrike: function(strikes, targetPrice) {
    if (!strikes.length || targetPrice <= 0) return null;

    return strikes.reduce((prev, curr) => {
      return (Math.abs(curr - targetPrice) < Math.abs(prev - targetPrice) ? curr : prev);
    });
  },

  // Add option cells to a table row
  addOptionCells: function(tableHtml, option, type) {
    const cellClass = type; // Using the passed type which includes ITM/OTM classes

    if (!option) {
      // If no option for this strike, add empty cells
      const emptyCells = `<td class="text-end ${cellClass}">-</td>`.repeat(6);
      tableHtml += emptyCells;
      if (this.includeGreeks) {
        tableHtml += `<td class="text-end ${cellClass}">-</td>`.repeat(3);
      }
      return tableHtml;
    }

    // Last price
    tableHtml += `
      <td class="text-end ${cellClass} fw-bold">
        ${this.formatCurrency(option.last_price)}
      </td>
    `;

    // Change
    let changeValue = parseFloat(option.change || 0);
    tableHtml += `
      <td class="text-end ${cellClass} ${changeValue > 0 ? 'text-success' : changeValue < 0 ? 'text-danger' : ''}">
        ${(changeValue >= 0 ? '+' : '') + changeValue.toFixed(2)}
      </td>
    `;

    // Bid
    tableHtml += `
      <td class="text-end ${cellClass}">${this.formatCurrency(option.bid)}</td>
    `;

    // Ask
    tableHtml += `
      <td class="text-end ${cellClass}">${this.formatCurrency(option.ask)}</td>
    `;

    // Volume
    tableHtml += `
      <td class="text-end ${cellClass}">${this.formatNumber(option.volume)}</td>
    `;

    // Open Interest
    tableHtml += `
      <td class="text-end ${cellClass}">${this.formatNumber(option.open_interest)}</td>
    `;

    // Greeks (if included)
    if (this.includeGreeks) {
      // Implied Volatility
      tableHtml += `
        <td class="text-end ${cellClass}">
          ${option.implied_volatility ? (parseFloat(option.implied_volatility) * 100).toFixed(1) + '%' : '-'}
        </td>
      `;

      // Delta
      tableHtml += `
        <td class="text-end ${cellClass}">
          ${option.delta ? parseFloat(option.delta).toFixed(3) : '-'}
        </td>
      `;

      // Gamma
      tableHtml += `
        <td class="text-end ${cellClass}">
          ${option.gamma ? parseFloat(option.gamma).toFixed(4) : '-'}
        </td>
      `;
    }

    return tableHtml;
  },

  /**
 * Adds the following function to the OptionsTable module to handle parity data:
 */

// Add to the OptionsTable object:

/**
 * Add put-call parity analysis to the options table
 * @param {Array} parityData - Array of parity analysis objects
 */
addParityAnalysis: function(parityData) {
  if (!parityData || !parityData.length) {
    console.error('No parity data provided');
    return;
  }

  console.log('Adding parity data to options table:', parityData.length, 'items');

  // Store the parity data
  this.parityData = parityData;

  // If the table is already displayed, update it immediately
  const tableContainer = document.getElementById('options-table-container');
  if (tableContainer && !tableContainer.classList.contains('d-none')) {
    this.updateTableWithParityData();
  }
},

/**
 * Update the options table with parity data
 * Adds columns and highlights for put-call parity analysis
 */
updateTableWithParityData: function() {
  if (!this.parityData || !this.parityData.length) return;

  // Get all table rows
  const table = document.querySelector('.options-table');
  if (!table) {
    console.error('Options table not found');
    return;
  }

  // First, add header columns for parity data
  const headerRow = table.querySelector('thead tr:last-child');
  if (!headerRow) return;

  // Check if we've already added the headers
  if (!headerRow.querySelector('.parity-header')) {
    // Add headers for calls side (after standard columns)
    const callsHeaderCell = document.createElement('th');
    callsHeaderCell.className = 'text-end parity-header';
    callsHeaderCell.innerText = 'P/C Parity';

    // Insert after standard call columns, before strike
    const strikeCol = headerRow.querySelector('.text-center.bg-light');
    if (strikeCol) {
      headerRow.insertBefore(callsHeaderCell, strikeCol);
    }

    // Add headers for puts side (after standard columns)
    const putsHeaderCell = document.createElement('th');
    putsHeaderCell.className = 'text-end parity-header';
    putsHeaderCell.innerText = 'P/C Parity';

    // Insert after all puts columns
    headerRow.appendChild(putsHeaderCell);

    // Add style for the parity columns
    const style = document.createElement('style');
    style.textContent = `
      .parity-cell {
        font-size: 0.8rem;
        background-color: rgba(108, 117, 125, 0.05);
      }
      .parity-positive {
        color: #28a745;
      }
      .parity-negative {
        color: #dc3545;
      }
      .arbitrage-opportunity {
        font-weight: bold;
        border: 1px solid rgba(25, 135, 84, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  // Now add the parity data to each row
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    // Find the strike price cell
    const strikeCell = row.querySelector('.strike-price');
    if (!strikeCell) return;

    // Extract the strike price
    const strikeText = strikeCell.textContent.trim();
    const strikePrice = parseFloat(strikeText.replace(/[^0-9.-]+/g, ''));

    // Find matching parity data
    const parityItem = this.parityData.find(item =>
      Math.abs(item.strike - strikePrice) < 0.01
    );

    if (!parityItem) return;

    // Check if we've already added parity cells to this row
    if (row.querySelector('.parity-cell')) return;

    // Create the call parity cell
    const callParityCell = document.createElement('td');
    callParityCell.className = 'text-end parity-cell';
    if (parityItem.callParity > 0) {
      callParityCell.classList.add('parity-positive');
      callParityCell.innerHTML = `+${parityItem.callParity}`;
    } else if (parityItem.callParity < 0) {
      callParityCell.classList.add('parity-negative');
      callParityCell.innerHTML = parityItem.callParity;
    } else {
      callParityCell.innerHTML = '0.00';
    }

    // If this is a significant arbitrage opportunity, highlight it
    if (parityItem.significantDiff && parityItem.arbitrage) {
      callParityCell.classList.add('arbitrage-opportunity');
      callParityCell.title = `${parityItem.arbitrage} opportunity`;
    }

    // Insert the call parity cell before the strike column
    row.insertBefore(callParityCell, strikeCell);

    // Create the put parity cell
    const putParityCell = document.createElement('td');
    putParityCell.className = 'text-end parity-cell';
    if (parityItem.putParity > 0) {
      putParityCell.classList.add('parity-positive');
      putParityCell.innerHTML = `+${parityItem.putParity}`;
    } else if (parityItem.putParity < 0) {
      putParityCell.classList.add('parity-negative');
      putParityCell.innerHTML = parityItem.putParity;
    } else {
      putParityCell.innerHTML = '0.00';
    }

    // If this is a significant arbitrage opportunity, highlight it
    if (parityItem.significantDiff && parityItem.arbitrage) {
      putParityCell.classList.add('arbitrage-opportunity');
      putParityCell.title = `${parityItem.arbitrage} opportunity`;
    }

    // Add the put parity cell at the end of the row
    row.appendChild(putParityCell);
  });

  // Show notification to user
  if (window.FinancialHub && window.FinancialHub.notification) {
    window.FinancialHub.notification(
      'Put-Call Parity analysis added to options table',
      'success'
    );
  }
},


  // Format currency (e.g., 125.75 -> $125.75)
  formatCurrency: function(value) {
    if (value === undefined || value === null) return 'N/A';
    return '$' + parseFloat(value).toFixed(2);
  },

  // Format number with commas (e.g., 1000 -> 1,000)
  formatNumber: function(value) {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat().format(parseInt(value));
  },

  // Format date (e.g., 2025-04-14 -> Apr 14, 2025)
  formatDateForDisplay: function(dateStr) {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateStr, error);
      return dateStr;
    }
  },

  // Show error
  showError: function(message) {
    console.error('Options Table Error:', message);
    if (window.OptionsController) {
      window.OptionsController.showError(message);
    } else {
      // Fallback if controller isn't available
      const container = document.getElementById('options-table-container');
      if (container) {
        container.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${message}
          </div>
        `;
        container.classList.remove('d-none');
      }
    }
  }
};

// Export the table for the master controller to use
window.OptionsTable = OptionsTable;

// Log that the table script has loaded
console.log('Options table script loaded with pagination, filtering, and ITM/OTM highlighting');