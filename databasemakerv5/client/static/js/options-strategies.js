/**
 * Options strategies module
 * @module options-strategies
 */

import { formatCurrency } from './utils.js';
import App from './app.js';

/**
 * Options strategies controller
 */
const OptionsStrategies = {
    /**
     * Reference to the main options view
     */
    optionsView: null,

    /**
     * Custom strategy components
     */
    customStrategy: {
        legs: [],
        name: 'Custom Strategy'
    },

    /**
     * Initialize the options strategies module
     * @param {Object} optionsView - Reference to the main options view
     */
    initialize: function(optionsView) {
        this.optionsView = optionsView;

        // Set up strategy button event listeners
        document.addEventListener('click', e => {
            if (e.target.id === 'strategy-long-call') {
                this.buildStrategy('long-call');
            } else if (e.target.id === 'strategy-long-put') {
                this.buildStrategy('long-put');
            } else if (e.target.id === 'strategy-bull-spread') {
                this.buildStrategy('bull-spread');
            } else if (e.target.id === 'strategy-bear-spread') {
                this.buildStrategy('bear-spread');
            } else if (e.target.id === 'strategy-iron-condor') {
                this.buildStrategy('iron-condor');
            } else if (e.target.id === 'strategy-butterfly') {
                this.buildStrategy('butterfly');
            } else if (e.target.id === 'export-strategy') {
                this.exportStrategy();
            } else if (e.target.id === 'clear-strategy') {
                this.clearStrategy();
            }
        });
    },

    /**
     * Build an options strategy
     * @param {string} strategyType - Type of strategy to build
     */
    buildStrategy: function(strategyType) {
        if (!this.optionsView.currentOptionsData || !this.optionsView.stockData) {
            App.showNotification('Please load options data first', 'warning');
            return;
        }

        const currentPrice = this.optionsView.stockData[this.optionsView.stockData.length - 1].close;

        // Get the active expiration date tab
        const activeTab = document.querySelector('#options-tabs .nav-link.active');
        if (!activeTab || activeTab.textContent === 'All Expirations') {
            App.showNotification('Please select a specific expiration date', 'warning');
            return;
        }

        const expDate = activeTab.textContent;

        // Filter options for the selected expiration
        const expirationOptions = this.optionsView.currentOptionsData.filter(opt =>
            this.optionsView.formatDate(opt.expiration_date) === expDate
        );

        // Strategies implementation
        let strategy = { type: strategyType, legs: [], cost: 0, maxProfit: 0, maxLoss: 0 };

        switch (strategyType) {
            case 'long-call':
                strategy = this.buildLongCallStrategy(expirationOptions, currentPrice);
                break;
            case 'long-put':
                strategy = this.buildLongPutStrategy(expirationOptions, currentPrice);
                break;
            case 'bull-spread':
                strategy = this.buildBullSpreadStrategy(expirationOptions, currentPrice);
                break;
            case 'bear-spread':
                strategy = this.buildBearSpreadStrategy(expirationOptions, currentPrice);
                break;
            case 'iron-condor':
                strategy = this.buildIronCondorStrategy(expirationOptions, currentPrice);
                break;
            case 'butterfly':
                strategy = this.buildButterflyStrategy(expirationOptions, currentPrice);
                break;
        }

        // Display the strategy
        this.displayStrategy(strategy);
    },

    /**
     * Build a long call strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildLongCallStrategy: function(options, currentPrice) {
        // Find slightly OTM call
        const targetStrike = this.optionsView.findClosestStrike(currentPrice * 1.05, options);
        const call = options.find(opt =>
            opt.contract_type === 'call' && opt.strike_price === targetStrike
        );

        if (!call) {
            return {
                type: 'long-call',
                legs: [],
                cost: 0,
                maxProfit: 'Unlimited',
                maxLoss: 0,
                error: 'Could not find appropriate options for this strategy'
            };
        }

        const cost = call.last_price * 100; // Per contract (100 shares)

        return {
            type: 'long-call',
            legs: [
                {
                    type: 'call',
                    action: 'buy',
                    strike: call.strike_price,
                    price: call.last_price,
                    expiration: this.optionsView.formatDate(call.expiration_date)
                }
            ],
            cost: cost,
            maxProfit: 'Unlimited',
            maxLoss: -cost,
            breakEven: call.strike_price + call.last_price
        };
    },

    /**
     * Build a long put strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildLongPutStrategy: function(options, currentPrice) {
        // Find slightly OTM put
        const targetStrike = this.optionsView.findClosestStrike(currentPrice * 0.95, options);
        const put = options.find(opt =>
            opt.contract_type === 'put' && opt.strike_price === targetStrike
        );

        if (!put) {
            return {
                type: 'long-put',
                legs: [],
                cost: 0,
                maxProfit: 0,
                maxLoss: 0,
                error: 'Could not find appropriate options for this strategy'
            };
        }

        const cost = put.last_price * 100; // Per contract (100 shares)
        const maxProfit = (put.strike_price * 100) - cost; // If stock goes to 0

        return {
            type: 'long-put',
            legs: [
                {
                    type: 'put',
                    action: 'buy',
                    strike: put.strike_price,
                    price: put.last_price,
                    expiration: this.optionsView.formatDate(put.expiration_date)
                }
            ],
            cost: cost,
            maxProfit: maxProfit,
            maxLoss: -cost,
            breakEven: put.strike_price - put.last_price
        };
    },

    /**
     * Build a bull call spread strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildBullSpreadStrategy: function(options, currentPrice) {
        // Find ATM call to buy
        const lowerStrike = this.optionsView.findClosestStrike(currentPrice, options);
        const buyCall = options.find(opt =>
            opt.contract_type === 'call' && opt.strike_price === lowerStrike
        );

        // Find OTM call to sell (about 10% higher)
        const higherStrike = this.optionsView.findClosestStrike(currentPrice * 1.1, options);
        const sellCall = options.find(opt =>
            opt.contract_type === 'call' && opt.strike_price === higherStrike
        );

        if (!buyCall || !sellCall) {
            return {
                type: 'bull-spread',
                legs: [],
                cost: 0,
                maxProfit: 0,
                maxLoss: 0,
                error: 'Could not find appropriate options for this strategy'
            };
        }

        const cost = (buyCall.last_price - sellCall.last_price) * 100;
        const maxProfit = ((higherStrike - lowerStrike) * 100) - cost;

        return {
            type: 'bull-call-spread',
            legs: [
                {
                    type: 'call',
                    action: 'buy',
                    strike: buyCall.strike_price,
                    price: buyCall.last_price,
                    expiration: this.optionsView.formatDate(buyCall.expiration_date)
                },
                {
                    type: 'call',
                    action: 'sell',
                    strike: sellCall.strike_price,
                    price: sellCall.last_price,
                    expiration: this.optionsView.formatDate(sellCall.expiration_date)
                }
            ],
            cost: cost,
            maxProfit: maxProfit,
            maxLoss: -cost,
            breakEven: lowerStrike + (cost / 100)
        };
    },

    /**
     * Build a bear put spread strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildBearSpreadStrategy: function(options, currentPrice) {
        // Find ATM put to buy
        const higherStrike = this.optionsView.findClosestStrike(currentPrice, options);
        const buyPut = options.find(opt =>
            opt.contract_type === 'put' && opt.strike_price === higherStrike
        );

        // Find OTM put to sell (about 10% lower)
        const lowerStrike = this.optionsView.findClosestStrike(currentPrice * 0.9, options);
        const sellPut = options.find(opt =>
            opt.contract_type === 'put' && opt.strike_price === lowerStrike
        );

        if (!buyPut || !sellPut) {
            return {
                type: 'bear-spread',
                legs: [],
                cost: 0,
                maxProfit: 0,
                maxLoss: 0,
                error: 'Could not find appropriate options for this strategy'
            };
        }

        const cost = (buyPut.last_price - sellPut.last_price) * 100;
        const maxProfit = ((higherStrike - lowerStrike) * 100) - cost;

        return {
            type: 'bear-put-spread',
            legs: [
                {
                    type: 'put',
                    action: 'buy',
                    strike: buyPut.strike_price,
                    price: buyPut.last_price,
                    expiration: this.optionsView.formatDate(buyPut.expiration_date)
                },
                {
                    type: 'put',
                    action: 'sell',
                    strike: sellPut.strike_price,
                    price: sellPut.last_price,
                    expiration: this.optionsView.formatDate(sellPut.expiration_date)
                }
            ],
            cost: cost,
            maxProfit: maxProfit,
            maxLoss: -cost,
            breakEven: higherStrike - (cost / 100)
        };
    },

    /**
     * Build an iron condor strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildIronCondorStrategy: function(options, currentPrice) {
        // Find put strikes (lower side of the condor)
        const putSellStrike = this.optionsView.findClosestStrike(currentPrice * 0.9, options);
        const putBuyStrike = this.optionsView.findClosestStrike(currentPrice * 0.8, options);

        // Find call strikes (upper side of the condor)
        const callSellStrike = this.optionsView.findClosestStrike(currentPrice * 1.1, options);
        const callBuyStrike = this.optionsView.findClosestStrike(currentPrice * 1.2, options);

        // Find the options
        const sellPut = options.find(opt =>
            opt.contract_type === 'put' && opt.strike_price === putSellStrike
        );
        const buyPut = options.find(opt =>
            opt.contract_type === 'put' && opt.strike_price === putBuyStrike
        );
        const sellCall = options.find(opt =>
            opt.contract_type === 'call' && opt.strike_price === callSellStrike
        );
        const buyCall = options.find(opt =>
            opt.contract_type === 'call' && opt.strike_price === callBuyStrike
        );

        if (!sellPut || !buyPut || !sellCall || !buyCall) {
            return {
                type: 'iron-condor',
                legs: [],
                cost: 0,
                maxProfit: 0,
                maxLoss: 0,
                error: 'Could not find appropriate options for this strategy'
            };
        }

        // Calculate net credit
        const credit = (sellPut.last_price - buyPut.last_price + sellCall.last_price - buyCall.last_price) * 100;

        // Calculate max loss
        const maxLoss = Math.min(
            (putSellStrike - putBuyStrike) * 100 - credit,
            (callBuyStrike - callSellStrike) * 100 - credit
        );

        return {
            type: 'iron-condor',
            legs: [
                {
                    type: 'put',
                    action: 'sell',
                    strike: sellPut.strike_price,
                    price: sellPut.last_price,
                    expiration: this.optionsView.formatDate(sellPut.expiration_date)
                },
                {
                    type: 'put',
                    action: 'buy',
                    strike: buyPut.strike_price,
                    price: buyPut.last_price,
                    expiration: this.optionsView.formatDate(buyPut.expiration_date)
                },
                {
                    type: 'call',
                    action: 'sell',
                    strike: sellCall.strike_price,
                    price: sellCall.last_price,
                    expiration: this.optionsView.formatDate(sellCall.expiration_date)
                },
                {
                    type: 'call',
                    action: 'buy',
                    strike: buyCall.strike_price,
                    price: buyCall.last_price,
                    expiration: this.optionsView.formatDate(buyCall.expiration_date)
                }
            ],
            cost: -credit, // Negative cost = credit
            maxProfit: credit,
            maxLoss: maxLoss,
            lowerBreakEven: putSellStrike - (credit / 100),
            upperBreakEven: callSellStrike + (credit / 100)
        };
    },

    /**
     * Build a butterfly spread strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildButterflyStrategy: function(options, currentPrice) {
        // Find strikes for butterfly (centered around the current price)
        const middleStrike = this.optionsView.findClosestStrike(currentPrice, options);
        const lowerStrike = this.optionsView.findClosestStrike(currentPrice * 0.95, options);
        const upperStrike = this.optionsView.findClosestStrike(currentPrice * 1.05, options);

        // Find the options
        const lowerCall = options.find(opt =>
            opt.contract_type === 'call' && opt.strike_price === lowerStrike
        );
        const middleCall1 = options.find(opt =>
            opt.contract_type === 'call' && opt.strike_price === middleStrike
        );
        const middleCall2 = {...middleCall1}; // We need 2 of these
        const upperCall = options.find(opt =>
            opt.contract_type === 'call' && opt.strike_price === upperStrike
        );

        if (!lowerCall || !middleCall1 || !upperCall) {
            return {
                type: 'butterfly',
                legs: [],
                cost: 0,
                maxProfit: 0,
                maxLoss: 0,
                error: 'Could not find appropriate options for this strategy'
            };
        }

        // Calculate cost
        const cost = (lowerCall.last_price - 2 * middleCall1.last_price + upperCall.last_price) * 100;

        // Calculate max profit
        const maxProfit = ((middleStrike - lowerStrike) * 100) - cost;

        return {
            type: 'butterfly-spread',
            legs: [
                {
                    type: 'call',
                    action: 'buy',
                    strike: lowerCall.strike_price,
                    price: lowerCall.last_price,
                    expiration: this.optionsView.formatDate(lowerCall.expiration_date)
                },
                {
                    type: 'call',
                    action: 'sell',
                    strike: middleCall1.strike_price,
                    price: middleCall1.last_price,
                    expiration: this.optionsView.formatDate(middleCall1.expiration_date),
                    quantity: 2
                },
                {
                    type: 'call',
                    action: 'buy',
                    strike: upperCall.strike_price,
                    price: upperCall.last_price,
                    expiration: this.optionsView.formatDate(upperCall.expiration_date)
                }
            ],
            cost: cost,
            maxProfit: maxProfit,
            maxLoss: cost > 0 ? -cost : 0, // Max loss is the cost if positive
            lowerBreakEven: lowerStrike + (cost / 100),
            upperBreakEven: upperStrike - (cost / 100)
        };
    },

    /**
     * Display options strategy in the UI
     * @param {Object} strategy - Strategy configuration
     */
    displayStrategy: function(strategy) {
        const strategyContainer = document.getElementById('strategy-builder-result');
        if (!strategyContainer) return;

        if (strategy.error) {
            strategyContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> ${strategy.error}
                </div>
            `;
            return;
        }

        // Create legs table
        let legsHtml = `
            <table class="table table-sm table-bordered mt-3">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Type</th>
                        <th>Strike</th>
                        <th>Price</th>
                        <th>Expiration</th>
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
                    <td>${formatCurrency(leg.strike)}</td>
                    <td>${formatCurrency(leg.price)}</td>
                    <td>${leg.expiration}</td>
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
                            <p><strong>Strategy Type:</strong> ${strategy.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                            <p><strong>Cost:</strong> ${strategy.cost < 0 ? 'Credit of ' + formatCurrency(-strategy.cost) : formatCurrency(strategy.cost)}</p>
                            <p><strong>Max Profit:</strong> ${typeof strategy.maxProfit === 'string' ? strategy.maxProfit : formatCurrency(strategy.maxProfit)}</p>
                            <p><strong>Max Loss:</strong> ${typeof strategy.maxLoss === 'string' ? strategy.maxLoss : formatCurrency(strategy.maxLoss)}</p>
                            ${strategy.breakEven ? `<p><strong>Break-Even:</strong> ${formatCurrency(strategy.breakEven)}</p>` : ''}
                            ${strategy.lowerBreakEven ? `<p><strong>Lower Break-Even:</strong> ${formatCurrency(strategy.lowerBreakEven)}</p>` : ''}
                            ${strategy.upperBreakEven ? `<p><strong>Upper Break-Even:</strong> ${formatCurrency(strategy.upperBreakEven)}</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Combine everything
        strategyContainer.innerHTML = `
            <h5 class="mt-4">Strategy: ${strategy.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h5>
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

        // Save the current strategy
        this.currentStrategy = strategy;
    },

    /**
     * Export strategy to CSV
     */
    exportStrategy: function() {
        if (!this.currentStrategy) return;

        const strategy = this.currentStrategy;

        // Create a CSV
        let csvContent = "data:text/csv;charset=utf-8,";

        // Add header
        csvContent += "Strategy: " + strategy.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + "\n\n";

        // Add legs
        csvContent += "Action,Type,Strike,Price,Expiration,Quantity\n";
        strategy.legs.forEach(leg => {
            csvContent += `${leg.action},${leg.type},${leg.strike},${leg.price},${leg.expiration},${leg.quantity || 1}\n`;
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
        link.setAttribute("download", `${strategy.type}_${this.optionsView.currentSymbol}_strategy.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * Clear current strategy
     */
    clearStrategy: function() {
        const strategyContainer = document.getElementById('strategy-builder-result');
        if (strategyContainer) {
            strategyContainer.innerHTML = '';
        }
        this.currentStrategy = null;
    },

    /**
     * Analyze option profit/loss
     * @param {Object} option - Option contract
     */
    analyzeOptionProfitLoss: function(option) {
        // Create a single-leg strategy
        const strategy = {
            type: option.contract_type === 'call' ? 'long-call' : 'long-put',
            legs: [
                {
                    type: option.contract_type,
                    action: 'buy',
                    strike: option.strike_price,
                    price: option.last_price,
                    expiration: this.optionsView.formatDate(option.expiration_date)
                }
            ],
            cost: option.last_price * 100
        };

        // Call common display method
        this.displayStrategy(strategy);
    },

    /**
     * Add option to custom strategy
     * @param {Object} option - Option contract
     */
    addToCustomStrategy: function(option) {
        // Add leg to custom strategy
        this.customStrategy.legs.push({
            type: option.contract_type,
            action: 'buy', // Default action
            strike: option.strike_price,
            price: option.last_price,
            expiration: this.optionsView.formatDate(option.expiration_date)
        });

        // Display notification
        App.showNotification(`Added ${option.contract_type.toUpperCase()} ${option.strike_price} to custom strategy`, 'success');

        // Display the custom strategy
        this.displayCustomStrategy();
    },

    /**
     * Display the custom strategy
     */
    displayCustomStrategy: function() {
        // Only display if we have legs
        if (this.customStrategy.legs.length === 0) return;

        // Calculate basic metrics
        let cost = 0;
        this.customStrategy.legs.forEach(leg => {
            const multiplier = leg.action === 'buy' ? 1 : -1;
            cost += multiplier * leg.price * 100 * (leg.quantity || 1);
        });

        // Create a strategy object
        const strategy = {
            type: 'custom-strategy',
            legs: this.customStrategy.legs,
            cost: cost,
            maxProfit: 'Varies by market conditions',
            maxLoss: cost > 0 ? -cost : 'Limited by strikes'
        };

        // Display the strategy
        this.displayStrategy(strategy);
    }
};

export default OptionsStrategies;