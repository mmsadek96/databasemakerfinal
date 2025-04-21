/**
 * Options Module - Master Controller
 * This file is responsible for fetching the options data and initializing the options table
 */

/**
 * Options Suggestions Module
 * Collects calculation data and sends it to the OpenAI API endpoint
 * for analysis and trading suggestions, with MongoDB caching
 */

// Check if module is already defined to prevent duplicate declaration
if (typeof OptionsSuggestion === 'undefined') {
    console.log('Defining OptionsSuggestion module');
// Export the module
window.OptionsSuggestion = {
  // Properties
  symbol: '',
  stockPrice: 0,
  expirationDate: '',
  calculationResults: [],
  optionsData: null,
  isLoading: false,
  cachedSuggestions: null,
  requestInProgress: false,
  maxRetries: 2,
  currentRetry: 0,

  /**
   * Initialize the suggestions module with data
   * @param {string} symbol - Stock symbol
   * @param {number} stockPrice - Current stock price
   * @param {string} expirationDate - Current expiration date
   * @param {Array} calculationResults - Results from options calculations
   * @param {Object} optionsData - Options data for the current expiration
   */
  initialize: function (symbol, stockPrice, expirationDate, calculationResults, optionsData) {
    this.symbol = symbol;
    this.stockPrice = stockPrice;
    this.expirationDate = expirationDate;
    this.calculationResults = calculationResults;
    this.optionsData = optionsData;
    this.cachedSuggestions = null;
    this.requestInProgress = false;
    this.currentRetry = 0;

    console.log(`Options suggestions initialized for ${symbol}`);

    // Show container
    this.setupSuggestionsContainer();

    // First try to get cached suggestions from MongoDB
    this.checkCachedSuggestions(symbol, expirationDate);
  },

  /**
   * Create or ensure the suggestions container exists
   */
  setupSuggestionsContainer: function () {
    // Check if container already exists
    let container = document.getElementById('options-suggestions-container');

    // If not, create it
    if (!container) {
      // Look for parent container
      const parentContainer = document.getElementById('options-calculations-container');
      if (!parentContainer) {
        console.error('Cannot find options-calculations-container to add suggestions');
        return;
      }

      // Create container
      container = document.createElement('div');
      container.id = 'options-suggestions-container';
      container.className = 'mt-4';
      container.innerHTML = this.getLoadingHTML();

      // Add to parent
      parentContainer.after(container);
    }

    // Show the container
    container.classList.remove('d-none');

    return container;
  },

  /**
   * Get HTML for the loading state
   */
  getLoadingHTML: function () {
    return `
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="card-title mb-0">
            <i class="bi bi-robot"></i> AI Trading Suggestions
          </h5>
        </div>
        <div class="card-body" id="ai-suggestions-content">
          <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Analyzing options data and generating trading suggestions...</p>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Check if there are cached suggestions for this symbol/expiration
   * @param {string} symbol - Stock symbol
   * @param {string} expirationDate - Expiration date
   */
  checkCachedSuggestions: function (symbol, expirationDate) {
    // First check if we already have suggestions in memory
    if (this.cachedSuggestions) {
      this.renderSuggestions(this.cachedSuggestions);
      return;
    }

    // Check if request is already in progress
    if (this.requestInProgress) {
      console.log('Request already in progress, not starting another one');
      return;
    }

    // Set loading state
    this.isLoading = true;
    this.requestInProgress = true;

    console.log(`Checking for cached suggestions for ${symbol} (${expirationDate})`);

    // Make API request to get cached suggestions
    fetch(`/api/analyze/options/${symbol}?expiration_date=${expirationDate}`)
        .then(response => {
          if (!response.ok) {
            // Handle 404 as expected case (no cached data)
            if (response.status === 404) {
              console.log('No cached suggestions found, generating new analysis');
              return null;
            }
            throw new Error(`API request failed with status ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          this.requestInProgress = false;

          if (data && data.suggestions && data.suggestions.length > 0) {
            console.log('Found cached suggestions:', data);

            // Store the cached suggestions
            this.cachedSuggestions = data.suggestions[0].analysis;

            // Display the cached suggestions
            this.renderSuggestions(this.cachedSuggestions);

            // Show cached indicator
            this.showCachedIndicator(data.suggestions[0].created_at);
          } else {
            // If no suggestions or empty result, generate new ones
            console.log('No valid cached suggestions found, generating new analysis');
            this.generateSuggestions();
          }
        })
        .catch(error => {
          this.requestInProgress = false;
          console.error('Error checking cached suggestions:', error);

          // Fallback to generating new suggestions
          this.generateSuggestions();
        });
  },

  /**
   * Generate options trading suggestions using OpenAI API endpoint
   */
  generateSuggestions: function () {
    // Reset state
    this.isLoading = true;
    this.requestInProgress = true;

    // Show loading state again (in case of refresh)
    const container = document.getElementById('options-suggestions-container');
    if (container) {
      container.innerHTML = this.getLoadingHTML();
    }

    // Prepare request data using all calculations
    const requestData = {
      symbol: this.symbol,
      stockPrice: this.stockPrice,
      expirationDate: this.expirationDate,
      calculationResults: this.calculationResults,
      optionsData: this.optionsData
    };

    console.log('Sending data to API for analysis:', requestData);

    // Call the backend API endpoint
    fetch('/api/analyze/options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData),
      // Set a longer timeout for this request
      signal: AbortSignal.timeout(60000) // 60 second timeout
    })
        .then(response => {
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }
          return response.json();
        })
        .then(analysisData => {
          this.isLoading = false;
          this.requestInProgress = false;
          this.currentRetry = 0; // Reset retry count on success
          console.log('Received AI analysis:', analysisData);

          // Store the suggestions for future use
          this.cachedSuggestions = analysisData;

          // Render the suggestions
          this.renderSuggestions(analysisData);
        })
        .catch(error => {
          this.isLoading = false;
          this.requestInProgress = false;
          console.error('Error generating AI suggestions:', error);

          // Implement retry logic for transient errors
          if (this.currentRetry < this.maxRetries) {
            this.currentRetry++;
            console.log(`Retrying analysis (attempt ${this.currentRetry}/${this.maxRetries})...`);

            // Show retry message
            this.showRetryMessage(this.currentRetry, this.maxRetries);

            // Retry after a short delay
            setTimeout(() => {
              this.generateSuggestions();
            }, 2000); // 2 second delay between retries
          } else {
            // Show error after all retries failed
            this.showError(`Failed to generate AI suggestions after ${this.maxRetries} attempts: ${error.message}`);
          }
        });
  },

  /**
   * Show retry message in the suggestions container
   * @param {number} attempt - Current retry attempt
   * @param {number} maxRetries - Maximum number of retries
   */
  showRetryMessage: function (attempt, maxRetries) {
    const container = document.getElementById('options-suggestions-container');
    if (!container) return;

    container.innerHTML = `
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="card-title mb-0">
            <i class="bi bi-robot"></i> AI Trading Suggestions
          </h5>
        </div>
        <div class="card-body" id="ai-suggestions-content">
          <div class="text-center py-4">
            <div class="spinner-border text-warning" role="status">
              <span class="visually-hidden">Retrying...</span>
            </div>
            <p class="mt-3">
              <i class="bi bi-arrow-repeat"></i> Retrying analysis (attempt ${attempt}/${maxRetries})...
            </p>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render the AI suggestions
   * @param {Object} suggestions - The AI-generated suggestions
   */
  renderSuggestions: function (suggestions) {
    if (!suggestions) {
      return;
    }

    const container = document.getElementById('options-suggestions-container');
    if (!container) {
      console.error('Cannot find options-suggestions-container');
      return;
    }

    // Create the HTML content for the suggestions
    let html = `
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="card-title mb-0">
            <i class="bi bi-robot"></i> AI Trading Suggestions for ${this.symbol}
          </h5>
        </div>
        <div class="card-body" id="ai-suggestions-content">
          <div class="mb-4">
            <h5 class="border-bottom pb-2">Summary</h5>
            <p>${suggestions.summary}</p>
          </div>
          
          <div class="mb-4">
            <h5 class="border-bottom pb-2">Market Outlook</h5>
            <p>${suggestions.marketOutlook}</p>
          </div>
          
          <div class="mb-4">
            <h5 class="border-bottom pb-2">Suggested Strategies</h5>
            <div class="list-group">
    `;

    // Add each strategy
    suggestions.strategies.forEach((strategy, index) => {
      html += `
        <div class="list-group-item">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${index + 1}. ${strategy.name}</h6>
          </div>
          <p class="mb-1">${strategy.description}</p>
        </div>
      `;
    });

    html += `
            </div>
          </div>
          
          <div class="mb-4">
            <h5 class="border-bottom pb-2">Risk Factors</h5>
            <ul class="list-group">
    `;

    // Add each risk factor
    suggestions.risks.forEach(risk => {
      html += `<li class="list-group-item">${risk}</li>`;
    });

    html += `
            </ul>
          </div>
    `;

    // Add contrarian view if available
    if (suggestions.contrarian) {
      html += `
        <div class="mb-4">
          <h5 class="border-bottom pb-2">Contrarian Perspective</h5>
          <div class="card bg-light">
            <div class="card-body">
              <p class="card-text">${suggestions.contrarian}</p>
            </div>
          </div>
        </div>
      `;
    }

    html += `
          <div class="bg-light p-3 rounded mt-3 small">
            <p class="mb-0"><strong>Disclaimer:</strong> These suggestions are generated by AI and should not be considered financial advice. Always do your own research and consider consulting with a financial advisor before making investment decisions.</p>
          </div>
          
          <div id="cached-indicator"></div>
        </div>
      </div>
    `;

    // Update the container
    container.innerHTML = html;
  },

  /**
   * Show a cached data indicator with timestamp
   * @param {string} timestamp - When the cached data was created
   */
  showCachedIndicator: function (timestamp) {
    const indicator = document.getElementById('cached-indicator');
    if (!indicator) return;

    // Convert timestamp to readable format
    let dateCreated;
    try {
      dateCreated = new Date(timestamp).toLocaleString();
    } catch (e) {
      dateCreated = "unknown time";
    }

    indicator.innerHTML = `
      <div class="mt-3 text-muted text-center">
        <small>
          <i class="bi bi-clock-history"></i> Analysis from cached data (generated on ${dateCreated})
          <button id="refresh-analysis-btn" class="btn btn-sm btn-outline-secondary ms-2">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </small>
      </div>
    `;

    // Add event listener to refresh button
    const refreshBtn = document.getElementById('refresh-analysis-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        // Clear cached suggestions and generate new ones
        this.cachedSuggestions = null;
        this.currentRetry = 0;

        // Show loading state
        const container = document.getElementById('options-suggestions-container');
        if (container) {
          container.innerHTML = this.getLoadingHTML();
        }

        // Generate new suggestions
        this.generateSuggestions();
      });
    }
  },

  /**
   * Show error message
   */
  showError: function (message) {
    const container = document.getElementById('options-suggestions-container');
    if (!container) return;

    container.innerHTML = `
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="card-title mb-0">
            <i class="bi bi-robot"></i> AI Trading Suggestions
          </h5>
        </div>
        <div class="card-body" id="ai-suggestions-content">
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${message}
          </div>
          <p>Please try again later or contact support if the problem persists.</p>
          <button id="retry-analysis-btn" class="btn btn-primary mt-2">
            <i class="bi bi-arrow-clockwise"></i> Try Again
          </button>
        </div>
      </div>
    `;

    // Add event listener to retry button
    const retryBtn = document.getElementById('retry-analysis-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        // Reset state and try again
        this.cachedSuggestions = null;
        this.currentRetry = 0;

        // Show loading state
        container.innerHTML = this.getLoadingHTML();

        // Generate new suggestions
        this.generateSuggestions();
      });
    }
  }
};

console.log('Options suggestion module loaded with robust error handling');

} else {
  console.log('OptionsSuggestion module already defined, skipping redefinition');
}

// Create the Options Controller
const OptionsController = {
  // Properties
  currentSymbol: '',
  optionsData: null,
  stockPrice: 0,
  VXXprice: 0,
  isLoading: false,
  error: null,

  // Initialize the controller
  init: function() {
    console.log('Options controller initializing');
    this.setupEventListeners();
    this.checkUrlParameters();

    // Load dependencies dynamically
    Promise.all([
      this.loadScript('/static/js/modules/options/options-table.js'),
      this.loadScript('/static/js/modules/options/options-calculation.js'),
      this.loadScript('/static/js/modules/options/options-suggestion.js')
    ])
      .then(() => {
        console.log('All options modules loaded successfully');
      })
      .catch(error => {
        console.error('Failed to load one or more options modules:', error);
        this.showError('Failed to load all components. Please try refreshing the page.');
      });
  },

  // Load a script dynamically with proper error handling
  loadScript: function(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  },

  // Set up event listeners
  setupEventListeners: function() {
    console.log('Setting up options event listeners');
    const loadButton = document.getElementById('load-options-button');
    const symbolInput = document.getElementById('options-symbol');
    const greeksCheckbox = document.getElementById('include-greeks');

    if (loadButton && symbolInput) {
      console.log('Found load button and symbol input');

      loadButton.addEventListener('click', () => {
        console.log('Load button clicked');
        const symbol = symbolInput.value.trim().toUpperCase();
        const includeGreeks = greeksCheckbox ? greeksCheckbox.checked : false;

        if (symbol) {
          this.loadOptionsData(symbol, includeGreeks);
        } else {
          this.showError('Please enter a stock symbol');
        }
      });

      // Also listen for Enter key on the input
      symbolInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          loadButton.click();
        }
      });
    } else {
      console.error('Could not find load button or symbol input');
    }
  },

  // Check URL parameters for symbol
  checkUrlParameters: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const symbol = urlParams.get('symbol');

    if (symbol) {
      console.log('Found symbol in URL:', symbol);
      const symbolInput = document.getElementById('options-symbol');
      const loadButton = document.getElementById('load-options-button');

      if (symbolInput && loadButton) {
        symbolInput.value = symbol.toUpperCase();
        // Load after a short delay to ensure UI is ready
        setTimeout(() => loadButton.click(), 500);
      }
    }
  },

  // Load options data
  loadOptionsData: function(symbol, includeGreeks = false) {
    if (!symbol) return;

    this.currentSymbol = symbol;
    this.isLoading = true;
    this.showLoading();

    // Update URL without refreshing the page
    const url = new URL(window.location);
    url.searchParams.set('symbol', symbol);
    window.history.pushState({}, '', url);

    console.log(`Fetching options data for ${symbol}, includeGreeks: ${includeGreeks}`);

    // First fetch real stock price from Alpha Vantage
    this.fetchRealStockPrice(symbol)
      .then(stockPrice => {
        // Store the stock price
        this.stockPrice = stockPrice;
        this.vxxPrice = this.fetchRealStockPrice('VXX'); // Fetch VXX price as well

        console.log(`Fetched real stock price for ${symbol}: $${this.stockPrice}`);

        // Now fetch options data
        return fetch(`/api/options/${symbol}?require_greeks=${includeGreeks}`);
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        this.optionsData = data;
        this.error = null;
        console.log(`Loaded options data for ${symbol}:`, data.length, 'contracts');

        // Process the data using the options table
        if (window.OptionsTable) {
          window.OptionsTable.displayOptions(symbol, data, includeGreeks);

          // After displaying options, run calculations if available
          this.runOptionsCalculations(symbol, data);
        } else {
          console.error('Options table not available - script may not be loaded');
          this.showError('Options table component not loaded properly. Please refresh and try again.');
        }
      })
      .catch(error => {
        console.error(`Error fetching options data for ${symbol}:`, error);
        this.error = error.message;
        this.optionsData = null;
        this.showError(error.message);
      })
      .finally(() => {
        this.isLoading = false;
        this.hideLoading();
      });
  },

  // Fetch real stock price from Alpha Vantage
  fetchRealStockPrice: function(symbol) {
    // Use intraday endpoint instead of daily
    return fetch(`/api/stock/${symbol}/intraday`)
      .then(response => {
        if (!response.ok) {
          console.warn(`Stock price fetch failed with status ${response.status}, will use estimated price`);
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (data && data.length > 0) {
          // Get the latest price from the response
          const latestData = data[data.length - 1];
          console.log("Real intraday stock data received:", latestData);
          return parseFloat(latestData.close);
        } else {
          console.warn('No stock price data received, will use estimated price');
          return 0;
        }
      })
      .catch(error => {
        console.warn('Error fetching real stock price:', error);
        return 0;
      });
  },

  // Run options calculations after table is displayed
  runOptionsCalculations: function(symbol, data) {
    // Check if we have the module loaded
    if (!window.OptionsCalculation) {
      console.log('Options calculation module not yet loaded, scheduling for later');
      setTimeout(() => this.runOptionsCalculations(symbol, data), 500);
      return;
    }

    // Need to organize data by expiration
    const expirationDates = [...new Set(data.map(option => option.expiration_date))].sort();

    if (expirationDates.length === 0) {
      console.error('No expiration dates found in options data');
      return;
    }

    // Get currently displayed expiration date
    let currentExpiration = expirationDates[0]; // Default to first
    const expirationSelect = document.getElementById('expiration-select');
    if (expirationSelect && expirationSelect.value) {
      currentExpiration = expirationSelect.value;
    }

    // Group options for current expiration
    const currentOptions = {
      calls: data.filter(opt =>
        opt.expiration_date === currentExpiration &&
        opt.contract_type.toLowerCase() === 'call'
      ),
      puts: data.filter(opt =>
        opt.expiration_date === currentExpiration &&
        opt.contract_type.toLowerCase() === 'put'
      )
    };

    console.log(`Running calculations for ${symbol}, expiration: ${currentExpiration}`);

    // Show or create the calculations container
    this.setupCalculationsContainer();

    // Initialize and run calculations
    window.OptionsCalculation.initialize(
      symbol,
      this.stockPrice,
      currentExpiration,
      currentOptions
    );

    // After calculations are done, run AI suggestions
    this.runOptionsSuggestions(symbol, currentExpiration, currentOptions);

    // Set up event listener for expiration changes to update calculations and suggestions
    if (expirationSelect) {
      // Remove existing listeners to avoid duplicates
      const newExpirationSelect = expirationSelect.cloneNode(true);
      expirationSelect.parentNode.replaceChild(newExpirationSelect, expirationSelect);

      newExpirationSelect.addEventListener('change', () => {
        const newExpiration = newExpirationSelect.value;
        if (newExpiration) {
          const newOptions = {
            calls: data.filter(opt =>
              opt.expiration_date === newExpiration &&
              opt.contract_type.toLowerCase() === 'call'
            ),
            puts: data.filter(opt =>
              opt.expiration_date === newExpiration &&
              opt.contract_type.toLowerCase() === 'put'
            )
          };

          // Run calculations for the new expiration
          window.OptionsCalculation.initialize(
            symbol,
            this.stockPrice,
            newExpiration,
            newOptions
          );

          // Update suggestions for the new expiration
          this.runOptionsSuggestions(symbol, newExpiration, newOptions);
        }
      });
    }
  },

  // Run AI options suggestions
  runOptionsSuggestions: function(symbol, expirationDate, optionsData) {
    // Check if we have the suggestions module loaded
    if (!window.OptionsSuggestion) {
      console.log('Options suggestion module not yet loaded, scheduling for later');
      setTimeout(() => this.runOptionsSuggestions(symbol, expirationDate, optionsData), 500);
      return;
    }

    // Check if we have calculation results
    if (!window.OptionsCalculation || !window.OptionsCalculation.calculationResults) {
      console.error('Cannot run suggestions without calculation results');
      return;
    }

    console.log(`Generating AI suggestions for ${symbol}, expiration: ${expirationDate}`);

    // Initialize and run suggestions
    window.OptionsSuggestion.initialize(
      symbol,
      this.stockPrice,
      this.VXXprice,
      expirationDate,
      window.OptionsCalculation.calculationResults,
      optionsData
    );
  },

  // Create or ensure the calculations container exists
  setupCalculationsContainer: function() {
    // Check if container already exists
    let container = document.getElementById('options-calculations-container');

    // If not, create it
    if (!container) {
      const optionsContainer = document.getElementById('options-data-container');
      if (!optionsContainer) {
        console.error('Cannot find options-data-container to add calculations');
        return;
      }

      container = document.createElement('div');
      container.id = 'options-calculations-container';
      container.className = 'd-none'; // Hidden by default until data loads

      optionsContainer.appendChild(container);
    }

    return container;
  },

  // Show loading state
  showLoading: function() {
    const loadingIndicator = document.getElementById('options-loading');
    if (loadingIndicator) {
      loadingIndicator.classList.remove('d-none');
    }

    // Hide any previous error
    this.hideError();

    // Hide any previous table
    const tableContainer = document.getElementById('options-table-container');
    if (tableContainer) {
      tableContainer.classList.add('d-none');
    }

    // Hide any previous calculations
    const calculationsContainer = document.getElementById('options-calculations-container');
    if (calculationsContainer) {
      calculationsContainer.classList.add('d-none');
    }

    // Hide any previous suggestions
    const suggestionsContainer = document.getElementById('options-suggestions-container');
    if (suggestionsContainer) {
      suggestionsContainer.classList.add('d-none');
    }
  },

  // Hide loading state
  hideLoading: function() {
    const loadingIndicator = document.getElementById('options-loading');
    if (loadingIndicator) {
      loadingIndicator.classList.add('d-none');
    }
  },

  // Show error message
  showError: function(message) {
    const errorDisplay = document.getElementById('options-error');
    if (errorDisplay) {
      errorDisplay.classList.remove('d-none');
      const errorMessage = document.getElementById('options-error-message');
      if (errorMessage) {
        errorMessage.textContent = message;
      }
    }
  },

  // Hide error message
  hideError: function() {
    const errorDisplay = document.getElementById('options-error');
    if (errorDisplay) {
      errorDisplay.classList.add('d-none');
    }
  }
};

// Initialize the controller when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing options controller');
  OptionsController.init();
});

// Export the controller for other scripts to use
window.OptionsController = OptionsController;


// Define export for module system compatibility
export default {
  initialize: function() {
    OptionsController.init();
  }
};