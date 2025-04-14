/**
 * Options Strategy Builder
 *
 * This module provides functionality for creating and analyzing
 * options trading strategies based on the available options data.
 */
import optionsDataManager from './optionsDataManager.js';

class OptionsStrategyBuilder {
    constructor() {
        // Storage for current strategy
        this.currentStrategy = null;

        // Custom strategy components
        this.customStrategy = {
            legs: [],
            name: 'Custom Strategy'
        };
    }

    /**
     * Initialize the strategy builder
     */
    initialize() {
        console.log('Initializing Options Strategy Builder');

        // Setup event handlers
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // We use event delegation for dynamically created elements
        document.addEventListener('click', (event) => {
            // Strategy buttons
            if (event.target.id === 'strategy-long-call') {
                this.buildStrategy('long-call');
            } else if (event.target.id === 'strategy-long-put') {
                this.buildStrategy('long-put');
            } else if (event.target.id === 'strategy-bull-spread') {
                this.buildStrategy('bull-spread');
            } else if (event.target.id === 'strategy-bear-spread') {
                this.buildStrategy('bear-spread');
            } else if (event.target.id === 'strategy-butterfly') {
                this.buildStrategy('butterfly');
            } else if (event.target.id === 'strategy-iron-condor') {
                this.buildStrategy('iron-condor');
            }
            // Export strategy button
            else if (event.target.id === 'export-strategy') {
                this.exportStrategy();
            }
            // Clear strategy button
            else if (event.target.id === 'clear-strategy') {
                this.clearStrategy();
            }
        });

        // Refresh expiration dates button
        const refreshButton = document.getElementById('refresh-expiration-dates');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.updateExpirationDateSelect();
            });
        }
    }

    /**
     * Update expiration dates dropdown
     * @param {string} symbol - Stock symbol
     */
    updateExpirationDateSelect(symbol) {
        // Get select element
        const expirationSelect = document.getElementById('strategy-expiration-date');
        if (!expirationSelect) return;

        // Clear existing options
        expirationSelect.innerHTML = '<option value="" selected disabled>Select an expiration date</option>';

        // If no symbol specified, use the current one
        if (!symbol && optionsDataManager.optionsData) {
            symbol = Object.keys(optionsDataManager.optionsData)[0];
        }

        if (!symbol) return;

        // Get expiration dates for the symbol
        const expirationDates = optionsDataManager.getExpirationDates(symbol);

        // Add options to select
        expirationDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = this.formatDateForDisplay(date);
            expirationSelect.appendChild(option);
        });
    }

    /**
     * Build an options strategy
     * @param {string} strategyType - Type of strategy
     */
    buildStrategy(strategyType) {
        console.log(`Building ${strategyType} strategy`);

        // Get selected expiration date
        const expirationSelect = document.getElementById('strategy-expiration-date');
        if (!expirationSelect || !expirationSelect.value) {
            this.showAlert('Please select an expiration date first', 'warning');
            return;
        }

        const expDate = expirationSelect.value;

        // Get symbol (assuming we have one loaded)
        const symbol = Object.keys(optionsDataManager.optionsData)[0];
        if (!symbol) {
            this.showAlert('No options data loaded. Please load options data first.', 'warning');
            return;
        }

        // Get options data for this expiration
        const options = optionsDataManager.getOptionsForExpiration(symbol, expDate);
        if (!options) {
            this.showAlert('No options data available for the selected expiration date', 'warning');
            return;
        }

        // Get the stock price
        const stockPrice = this.getStockPrice();
        if (!stockPrice) {
            this.showAlert('Stock price information is missing', 'warning');
            return;
        }

        // Build the strategy based on type
        let strategy;

        switch (strategyType) {
            case 'long-call':
                strategy = this.buildLongCallStrategy(options, stockPrice, expDate);
                break;
            case 'long-put':
                strategy = this.buildLongPutStrategy(options, stockPrice, expDate);
                break;
            case 'bull-spread':
                strategy = this.buildBullCallSpreadStrategy(options, stockPrice, expDate);
                break;
            case 'bear-spread':
                strategy = this.buildBearPutSpreadStrategy(options, stockPrice, expDate);
                break;
            case 'butterfly':
                strategy = this.buildButterflyStrategy(options, stockPrice, expDate);
                break;
            case 'iron-condor':
                strategy = this.buildIronCondorStrategy(options, stockPrice, expDate);
                break;
            default:
                this.showAlert('Unknown strategy type', 'danger');
                return;
        }

        // Save the current strategy
        this.currentStrategy = strategy;

        // Display the strategy
        this.displayStrategy(strategy);
    }

    /**
     * Build a long call strategy
     * @param {Object} options - Options data
     * @param {number} stockPrice - Current stock price
     * @param {string} expDate - Expiration date
     * @returns {Object} - Strategy object
     */
    buildLongCallStrategy(options, stockPrice, expDate) {
        // Find an ATM or slightly OTM call
        const targetStrike = this.findClosestStrike(stockPrice * 1.05, options);
        const call = options.calls.find(opt => parseFloat(opt.strike) === targetStrike);

        if (!call) {
            this.showAlert('Could not find appropriate options for this strategy', 'warning');
            return null;
        }

        // Calculate cost and potential profit
        const cost = parseFloat(call.last) * 100; // Per contract (100 shares)

        return {
            type: 'long-call',
            name: 'Long Call',
            expiration: expDate,
            legs: [
                {
                    type: 'call',
                    action: 'buy',
                    strike: call.strike,
                    price: call.last,
                    contract: call.contractID
                }
            ],
            cost: cost,
            maxProfit: 'Unlimited',
            maxLoss: cost,
            breakEven: parseFloat(call.strike) + parseFloat(call.last)
        };
    }

    /**
     * Build a long put strategy
     * @param {Object} options - Options data
     * @param {number} stockPrice - Current stock price
     * @param {string} expDate - Expiration date
     * @returns {Object} - Strategy object
     */
    buildLongPutStrategy(options, stockPrice, expDate) {
        // Find an ATM or slightly OTM put
        const targetStrike = this.findClosestStrike(stockPrice * 0.95, options);
        const put = options.puts.find(opt => parseFloat(opt.strike) === targetStrike);

        if (!put) {
            this.showAlert('Could not find appropriate options for this strategy', 'warning');
            return null;
        }

        // Calculate cost and potential profit
        const cost = parseFloat(put.last) * 100; // Per contract (100 shares)
        const maxProfit = parseFloat(put.strike) * 100 - cost;

        return {
            type: 'long-put',
            name: 'Long Put',
            expiration: expDate,
            legs: [
                {
                    type: 'put',
                    action: 'buy',
                    strike: put.strike,
                    price: put.last,
                    contract: put.contractID
                }
            ],
            cost: cost,
            maxProfit: maxProfit,
            maxLoss: cost,
            breakEven: parseFloat(put.strike) - parseFloat(put.last)
        };
    }

    /**
     * Build a bull call spread strategy
     * @param {Object} options - Options data
     * @param {number} stockPrice - Current stock price
     * @param {string} expDate - Expiration date
     * @returns {Object} - Strategy object
     */
    buildBullCallSpreadStrategy(options, stockPrice, expDate) {
        // Find ATM call to buy
        const lowerStrike = this.findClosestStrike(stockPrice, options);
        const buyCall = options.calls.find(opt => parseFloat(opt.strike) === lowerStrike);

        // Find OTM call to sell (about 10% higher)
        const higherStrike = this.findClosestStrike(stockPrice * 1.1, options);
        const sellCall = options.calls.find(opt => parseFloat(opt.strike) === higherStrike);

        if (!buyCall || !sellCall) {
            this.showAlert('Could not find appropriate options for this strategy', 'warning');
            return null;
        }

        // Calculate cost and potential profit
        const cost = (parseFloat(buyCall.last) - parseFloat(sellCall.last)) * 100;
        const maxProfit = ((higherStrike - lowerStrike) * 100) - cost;

        return {
            type: 'bull-call-spread',
            name: 'Bull Call Spread',
            expiration: expDate,
            legs: [
                {
                    type: 'call',
                    action: 'buy',
                    strike: buyCall.strike,
                    price: buyCall.last,
                    contract: buyCall.contractID
                },
                {
                    type: 'call',
                    action: 'sell',
                    strike: sellCall.strike,
                    price: sellCall.last,
                    contract: sellCall.contractID
                }
            ],
            cost: cost,
            maxProfit: maxProfit,
            maxLoss: cost,
            breakEven: parseFloat(buyCall.strike) + (cost / 100)
        };
    }

    /**
     * Build a bear put spread strategy
     * @param {Object} options - Options data
     * @param {number} stockPrice - Current stock price
     * @param {string} expDate - Expiration date
     * @returns {Object} - Strategy object
     */
    buildBearPutSpreadStrategy(options, stockPrice, expDate) {
        // Find ATM put to buy
        const higherStrike = this.findClosestStrike(stockPrice, options);
        const buyPut = options.puts.find(opt => parseFloat(opt.strike) === higherStrike);

        // Find OTM put to sell (about 10% lower)
        const lowerStrike = this.findClosestStrike(stockPrice * 0.9, options);
        const sellPut = options.puts.find(opt => parseFloat(opt.strike) === lowerStrike);

        if (!buyPut || !sellPut) {
            this.showAlert('Could not find appropriate options for this strategy', 'warning');
            return null;
        }

        // Calculate cost and potential profit
        const cost = (parseFloat(buyPut.last) - parseFloat(sellPut.last)) * 100;
        const maxProfit = ((higherStrike - lowerStrike) * 100) - cost;

        return {
            type: 'bear-put-spread',
            name: 'Bear Put Spread',
            expiration: expDate,
            legs: [
                {
                    type: 'put',
                    action: 'buy',
                    strike: buyPut.strike,
                    price: buyPut.last,
                    contract: buyPut.contractID
                },
                {
                    type: 'put',
                    action: 'sell',
                    strike: sellPut.strike,
                    price: sellPut.last,
                    contract: sellPut.contractID
                }
            ],
            cost: cost,
            maxProfit: maxProfit,
            maxLoss: cost,
            breakEven: parseFloat(buyPut.strike) - (cost / 100)
        };
    }

    /**
     * Build a butterfly strategy
     * @param {Object} options - Options data
     * @param {number} stockPrice - Current stock price
     * @param {string} expDate - Expiration date
     * @returns {Object} - Strategy object
     */
    buildButterflyStrategy(options, stockPrice, expDate) {
        // Find strikes for butterfly (centered around the current price)
        const middleStrike = this.findClosestStrike(stockPrice, options);
        const lowerStrike = this.findClosestStrike(stockPrice * 0.95, options);
        const upperStrike = this.findClosestStrike(stockPrice * 1.05, options);

        // Find the options
        const lowerCall = options.calls.find(opt => parseFloat(opt.strike) === lowerStrike);
        const middleCall = options.calls.find(opt => parseFloat(opt.strike) === middleStrike);
        const upperCall = options.calls.find(opt => parseFloat(opt.strike) === upperStrike);

        if (!lowerCall || !middleCall || !upperCall) {
            this.showAlert('Could not find appropriate options for this strategy', 'warning');
            return null;
        }

        // Calculate cost and potential profit
        const cost = (parseFloat(lowerCall.last) - 2 * parseFloat(middleCall.last) + parseFloat(upperCall.last)) * 100;
        const maxProfit = ((middleStrike - lowerStrike) * 100) - cost;

        return {
            type: 'butterfly-spread',
            name: 'Butterfly Spread',
            expiration: expDate,
            legs: [
                {
                    type: 'call',
                    action: 'buy',
                    strike: lowerCall.strike,
                    price: lowerCall.last,
                    contract: lowerCall.contractID
                },
                {
                    type: 'call',
                    action: 'sell',
                    strike: middleCall.strike,
                    price: middleCall.last,
                    contract: middleCall.contractID,
                    quantity: 2
                },
                {
                    type: 'call',
                    action: 'buy',
                    strike: upperCall.strike,
                    price: upperCall.last,
                    contract: upperCall.contractID
                }
            ],
            cost: cost,
            maxProfit: maxProfit,
            maxLoss: cost > 0 ? cost : 0,
            lowerBreakEven: parseFloat(lowerCall.strike) + (cost / 100),
            upperBreakEven: parseFloat(upperCall.strike) - (cost / 100)
        };
    }

    /**
     * Build an iron condor strategy
     * @param {Object} options - Options data
     * @param {number} stockPrice - Current stock price
     * @param {string} expDate - Expiration date
     * @returns {Object} - Strategy object
     */
    buildIronCondorStrategy(options, stockPrice, expDate) {
        // Find put strikes (lower side of the condor)
        const putSellStrike = this.findClosestStrike(stockPrice * 0.9, options);
        const putBuyStrike = this.findClosestStrike(stockPrice * 0.8, options);

        // Find call strikes (upper side of the condor)
        const callSellStrike = this.findClosestStrike(stockPrice * 1.1, options);
        const callBuyStrike = this.findClosestStrike(stockPrice * 1.2, options);

        // Find the options
        const sellPut = options.puts.find(opt => parseFloat(opt.strike) === putSellStrike);
        const buyPut = options.puts.find(opt => parseFloat(opt.strike) === putBuyStrike);
        const sellCall = options.calls.find(opt => parseFloat(opt.strike) === callSellStrike);
        const buyCall = options.calls.find(opt => parseFloat(opt.strike) === callBuyStrike);

        if (!sellPut || !buyPut || !sellCall || !buyCall) {
            this.showAlert('Could not find appropriate options for this strategy', 'warning');
            return null;
        }

        // Calculate credit and max loss
        const credit = (parseFloat(sellPut.last) - parseFloat(buyPut.last) +
                       parseFloat(sellCall.last) - parseFloat(buyCall.last)) * 100;

        // Calculate max loss
        const maxLoss = Math.min(
            (putSellStrike - putBuyStrike) * 100 - credit,
            (callBuyStrike - callSellStrike) * 100 - credit
        );

        return {
            type: 'iron-condor',
            name: 'Iron Condor',
            expiration: expDate,
            legs: [
                {
                    type: 'put',
                    action: 'sell',
                    strike: sellPut.strike,
                    price: sellPut.last,
                    contract: sellPut.contractID
                },
                {
                    type: 'put',
                    action: 'buy',
                    strike: buyPut.strike,
                    price: buyPut.last,
                    contract: buyPut.contractID
                },
                {
                    type: 'call',
                    action: 'sell',
                    strike: sellCall.strike,
                    price: sellCall.last,
                    contract: sellCall.contractID
                },
                {
                    type: 'call',
                    action: 'buy',
                    strike: buyCall.strike,
                    price: buyCall.last,
                    contract: buyCall.contractID
                }
            ],
            cost: -credit,  // Negative cost means credit
            maxProfit: credit,
            maxLoss: maxLoss,
            lowerBreakEven: parseFloat(sellPut.strike) - (credit / 100),
            upperBreakEven: parseFloat(sellCall.strike) + (credit / 100)
        };
    }

    /**
     * Find the strike price closest to a target price
     * @param {number} targetPrice - Target price
     * @param {Object} options - Options data
     * @returns {number} - Closest strike price
     */
    findClosestStrike(targetPrice, options) {
        // Collect all unique strike prices
        const strikes = new Set();

        options.calls.forEach(call => strikes.add(parseFloat(call.strike)));
        options.puts.forEach(put => strikes.add(parseFloat(put.strike)));

        // Convert to array and sort
        const strikeArray = Array.from(strikes).sort((a, b) => a - b);

        // Find closest strike
        let closestStrike = strikeArray[0];
        let minDiff = Math.abs(strikeArray[0] - targetPrice);

        strikeArray.forEach(strike => {
            const diff = Math.abs(strike - targetPrice);

            if (diff < minDiff) {
                minDiff = diff;
                closestStrike = strike;
            }
        });

        return closestStrike;
    }

    /**
     * Display a strategy in the UI
     * @param {Object} strategy - Strategy object
     */
    displayStrategy(strategy) {
        if (!strategy) return;

        const resultContainer = document.getElementById('strategy-builder-result');
        if (!resultContainer) return;

        // Create legs table
        let legsHtml = `
            <table class="table table-sm table-bordered mt-3">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Type</th>
                        <th>Strike</th>
                        <th>Price</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
        `;

        strategy.legs.forEach(leg => {
            legsHtml += `
                <tr>
                    <td class="${leg.action === 'buy' ? 'text-success' : 'text-danger'} fw-bold">${leg.action.toUpperCase()}</td>
                    <td>${leg.type.toUpperCase()}</td>
                    <td>${this.formatCurrency(leg.strike)}</td>
                    <td>${this.formatCurrency(leg.price)}</td>
                    <td>${leg.quantity || 1}</td>
                </tr>
            `;
        });

        legsHtml += `
                </tbody>
            </table>
        `;

        // Create strategy metrics
        let metricsHtml = `
            <div class="row mt-3">
                <div class="col">
                    <div class="card border-primary">
                        <div class="card-header bg-primary text-white">Strategy Metrics</div>
                        <div class="card-body">
                            <p><strong>Strategy Type:</strong> ${strategy.name}</p>
                            <p><strong>Expiration Date:</strong> ${this.formatDateForDisplay(strategy.expiration)}</p>
                            <p><strong>Cost:</strong> ${strategy.cost < 0 ? 'Credit of ' + this.formatCurrency(-strategy.cost) : this.formatCurrency(strategy.cost)}</p>
                            <p><strong>Max Profit:</strong> ${typeof strategy.maxProfit === 'string' ? strategy.maxProfit : this.formatCurrency(strategy.maxProfit)}</p>
                            <p><strong>Max Loss:</strong> ${typeof strategy.maxLoss === 'string' ? strategy.maxLoss : this.formatCurrency(strategy.maxLoss)}</p>
                            ${strategy.breakEven ? `<p><strong>Break-Even:</strong> ${this.formatCurrency(strategy.breakEven)}</p>` : ''}
                            ${strategy.lowerBreakEven ? `<p><strong>Lower Break-Even:</strong> ${this.formatCurrency(strategy.lowerBreakEven)}</p>` : ''}
                            ${strategy.upperBreakEven ? `<p><strong>Upper Break-Even:</strong> ${this.formatCurrency(strategy.upperBreakEven)}</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Combine everything
        resultContainer.innerHTML = `
            <h5 class="mt-2">${strategy.name}</h5>
            ${legsHtml}
            ${metricsHtml}
            <div class="mt-3">
                <button class="btn btn-success" id="export-strategy">
                    <i class="bi bi-download"></i> Export Strategy
                </button>
                <button class="btn btn-secondary" id="clear-strategy">
                    <i class="bi bi-x-circle"></i> Clear
                </button>
            </div>
        `;
    }

    /**
     * Export the current strategy to CSV
     */
    exportStrategy() {
        if (!this.currentStrategy) {
            this.showAlert('No strategy to export', 'warning');
            return;
        }

        const strategy = this.currentStrategy;

        // Build CSV content
        let csvContent = "data:text/csv;charset=utf-8,";

        // Add header
        csvContent += `Strategy: ${strategy.name}\n\n`;

        // Add legs
        csvContent += "Action,Type,Strike,Price,Quantity\n";
        strategy.legs.forEach(leg => {
            csvContent += `${leg.action},${leg.type},${leg.strike},${leg.price},${leg.quantity || 1}\n`;
        });

        // Add metrics
        csvContent += "\nMetrics\n";
        csvContent += `Cost,${strategy.cost}\n`;
        csvContent += `Max Profit,${strategy.maxProfit}\n`;
        csvContent += `Max Loss,${strategy.maxLoss}\n`;
        if (strategy.breakEven) csvContent += `Break-Even,${strategy.breakEven}\n`;
        if (strategy.lowerBreakEven) csvContent += `Lower Break-Even,${strategy.lowerBreakEven}\n`;
        if (strategy.upperBreakEven) csvContent += `Upper Break-Even,${strategy.upperBreakEven}\n`;

        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${strategy.type}_strategy.csv`);
        document.body.appendChild(link);

        // Trigger download
        link.click();

        // Clean up
        document.body.removeChild(link);

        this.showAlert('Strategy exported successfully', 'success');
    }

    /**
     * Clear the current strategy
     */
    clearStrategy() {
        this.currentStrategy = null;

        const resultContainer = document.getElementById('strategy-builder-result');
        if (resultContainer) {
            resultContainer.innerHTML = `
                <p class="text-muted text-center">
                    Select an expiration date and then a strategy template to build and analyze an options strategy.
                </p>
            `;
        }
    }

    /**
     * Add a specific option contract to a custom strategy
     * @param {Object} option - Option contract data
     */
    addToCustomStrategy(option) {
        this.customStrategy.legs.push({
            type: option.type.toLowerCase(),
            action: 'buy', // Default action
            strike: option.strike,
            price: option.last,
            contract: option.contractID
        });

        this.showAlert(`Added ${option.type.toUpperCase()} ${option.strike} to custom strategy`, 'success');

        // Display the custom strategy
        this.displayCustomStrategy();
    }

    /**
     * Display the current custom strategy
     */
    displayCustomStrategy() {
        if (this.customStrategy.legs.length === 0) {
            return;
        }

        // Calculate total cost
        let cost = 0;
        this.customStrategy.legs.forEach(leg => {
            const multiplier = leg.action === 'buy' ? 1 : -1;
            cost += multiplier * parseFloat(leg.price) * 100 * (leg.quantity || 1);
        });

        const strategy = {
            type: 'custom-strategy',
            name: 'Custom Strategy',
            expiration: this.customStrategy.legs[0]?.contract?.split('-')[0] || 'Various',
            legs: this.customStrategy.legs,
            cost: cost,
            maxProfit: cost < 0 ? Math.abs(cost) : 'Varies based on market conditions',
            maxLoss: cost > 0 ? cost : 'Varies based on market conditions'
        };

        this.currentStrategy = strategy;
        this.displayStrategy(strategy);
    }

    /**
     * Get the current stock price from the UI
     * @returns {number|null} - Stock price or null if not found
     */
    getStockPrice() {
        const priceElement = document.getElementById('current-stock-price');
        if (!priceElement) return null;

        const priceText = priceElement.textContent;
        return parseFloat(priceText.replace(/[^\d.-]/g, '')); // Remove currency symbols and commas
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
     * Format date for display
     * @param {string} dateStr - ISO date string
     * @returns {string} - Formatted date string
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
     * Show an alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, warning, danger, info)
     */
    showAlert(message, type = 'info') {
        // Use app notification system if available
        if (window.App && typeof window.App.showNotification === 'function') {
            window.App.showNotification(message, type);
            return;
        }

        // Create alert div
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            ${type === 'warning' ? '<i class="bi bi-exclamation-triangle-fill me-2"></i>' : 
              type === 'danger' ? '<i class="bi bi-x-circle-fill me-2"></i>' :
              type === 'success' ? '<i class="bi bi-check-circle-fill me-2"></i>' :
              '<i class="bi bi-info-circle-fill me-2"></i>'}
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Find a good container to add the alert to
        const container = document.getElementById('strategy-builder-result') ||
                          document.getElementById('options-container');

        if (container) {
            container.prepend(alertDiv);

            // Remove the alert after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.classList.remove('show');
                    setTimeout(() => alertDiv.remove(), 300);
                }
            }, 5000);
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Export singleton instance
const optionsStrategyBuilder = new OptionsStrategyBuilder();
export default optionsStrategyBuilder;