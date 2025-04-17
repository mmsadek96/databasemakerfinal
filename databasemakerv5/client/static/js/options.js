/**
 * Options Module - Master Controller
 * This file is responsible for fetching the options data and initializing the options table
 */

// Create the Options Controller
const OptionsController = {
  // Properties
  currentSymbol: '',
  optionsData: null,
  stockPrice: 0,
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
    return fetch(`/api/stock/${symbol}/`)
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