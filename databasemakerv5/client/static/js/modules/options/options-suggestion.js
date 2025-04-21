/**
 * Options Suggestions Module
 * Collects calculation data and sends it to the OpenAI API endpoint
 * for analysis and trading suggestions
 */

// Check if module is already defined to prevent duplicate declaration
if (typeof OptionsSuggestion === 'undefined') {

const OptionsSuggestion = {
  // Properties
  symbol: '',
  stockPrice: 0,
  vxxPrice: 0,
  expirationDate: '',
  calculationResults: [],
  optionsData: null,
  isLoading: false,

  /**
   * Initialize the suggestions module with data
   * @param {string} symbol - Stock symbol
   * @param {number} stockPrice - Current stock price
   * @param {number} vxxPrice - Current VXX price
   * @param {string} expirationDate - Current expiration date
   * @param {Array} calculationResults - Results from options calculations
   * @param {Object} optionsData - Options data for the current expiration
   */
  initialize: function(symbol, stockPrice, vxxPrice, expirationDate, calculationResults, optionsData) {
    this.symbol = symbol;
    this.stockPrice = stockPrice;
    this.vxxPrice = vxxPrice;
    this.expirationDate = expirationDate;
    this.calculationResults = calculationResults;
    this.optionsData = optionsData;

    console.log(`Options suggestions initialized for ${symbol}`);

    // Show container
    this.setupSuggestionsContainer();

    // Generate AI suggestions
    this.generateSuggestions();
  },

  /**
   * Create or ensure the suggestions container exists
   */
  setupSuggestionsContainer: function() {
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
  getLoadingHTML: function() {
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
   * Generate options trading suggestions using OpenAI API endpoint
   */
  generateSuggestions: function() {
    this.isLoading = true;

    // Prepare request data using all calculations
    const requestData = {
      symbol: this.symbol,
      stockPrice: this.stockPrice,
      vxxPrice: this.vxxPrice,
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
      body: JSON.stringify(requestData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then(analysisData => {
        this.isLoading = false;
        console.log('Received AI analysis:', analysisData);
        this.renderSuggestions(analysisData);
      })
      .catch(error => {
        this.isLoading = false;
        console.error('Error generating AI suggestions:', error);
        this.showError(`Failed to generate AI suggestions: ${error.message}`);
      });
  },

  /**
   * Render the AI suggestions
   * @param {Object} suggestions - The AI-generated suggestions
   */
  renderSuggestions: function(suggestions) {
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
        </div>
      </div>
    `;

    // Update the container
    container.innerHTML = html;
  },

  /**
   * Show error message
   */
  showError: function(message) {
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
        </div>
      </div>
    `;
  }
};

// Export the module
window.OptionsSuggestion = OptionsSuggestion;

console.log('Options suggestion module loaded');

} else {
  console.log('OptionsSuggestion module already defined, skipping redefinition');
}