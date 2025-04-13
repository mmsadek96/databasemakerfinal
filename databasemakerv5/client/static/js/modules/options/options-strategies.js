/**
 * Options Strategies Module
 * Responsible for building and analyzing options trading strategies
 */
class OptionsStrategiesModule {
    /**
     * Constructor
     * @param {Object} optionsView - Reference to the main options view
     */
    constructor(optionsView) {
        this.optionsView = optionsView;

        // Current strategy
        this.currentStrategy = null;

        // Custom strategy components
        this.customStrategy = {
            legs: [],
            name: 'Custom Strategy'
        };
    }

    /**
     * Initialize the options strategies module
     */
    initialize() {
        console.log("Options Strategies Module initialized");
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Set up strategy button event listeners using event delegation
        document.addEventListener('click', e => {
            if (e.target.id === 'strategy-long-call') {
                console.log("Long Call button clicked");
                this.buildStrategy('long-call');
            } else if (e.target.id === 'strategy-long-put') {
                console.log("Long Put button clicked");
                this.buildStrategy('long-put');
            } else if (e.target.id === 'strategy-bull-spread') {
                console.log("Bull Spread button clicked");
                this.buildStrategy('bull-spread');
            } else if (e.target.id === 'strategy-bear-spread') {
                console.log("Bear Spread button clicked");
                this.buildStrategy('bear-spread');
            } else if (e.target.id === 'strategy-iron-condor') {
                console.log("Iron Condor button clicked");
                this.buildStrategy('iron-condor');
            } else if (e.target.id === 'strategy-butterfly') {
                console.log("Butterfly button clicked");
                this.buildStrategy('butterfly');
            } else if (e.target.id === 'export-strategy') {
                this.exportStrategy();
            } else if (e.target.id === 'clear-strategy') {
                this.clearStrategy();
            }
        });
    }

    /**
     * Build an options strategy
     * @param {string} strategyType - Type of strategy to build
     */
    buildStrategy(strategyType) {
        console.log(`Building strategy: ${strategyType}`);

        if (!this.optionsView.currentOptionsData || !this.optionsView.stockData) {
            console.warn("Missing required data for strategy building");
            // Use App.showNotification if available
            if (window.App && App.showNotification) {
                App.showNotification('Please load options data first', 'warning');
            } else {
                alert('Please load options data first');
            }
            return;
        }

        console.log(`Options data available: ${this.optionsView.currentOptionsData.length} options`);
        console.log(`Stock data available: ${this.optionsView.stockData.length} data points`);

        const currentPrice = this.optionsView.stockData[this.optionsView.stockData.length - 1].close;
        console.log(`Current stock price: ${currentPrice}`);

        // Get the active expiration date tab
        const activeTab = document.querySelector('#options-tabs .nav-link.active');
        console.log("Active tab:", activeTab ? activeTab.textContent : "None");

        // Check for static strategy-expiration-date dropdown first
        const expirationDateSelect = document.getElementById('strategy-expiration-date');
        if (expirationDateSelect && expirationDateSelect.value) {
            console.log("Using pre-selected expiration date from dropdown:", expirationDateSelect.value);

            // Filter options for the selected expiration
            const expirationOptions = this.optionsView.currentOptionsData.filter(opt =>
                this.optionsView.formatDate(opt.expiration_date) === expirationDateSelect.value
            );

            console.log(`Found ${expirationOptions.length} options for ${expirationDateSelect.value}`);

            if (expirationOptions.length > 0) {
                // Continue with strategy building using the filtered options
                this.buildStrategyWithOptions(strategyType, expirationOptions, currentPrice, expirationDateSelect.value);
                return;
            }
        }

        // Check if All Expirations tab is active
        if (!activeTab || activeTab.id === 'all-tab' || activeTab.textContent === 'All Expirations') {
            console.log("All Expirations tab is active, creating date selector UI");

            // Instead of showing warning, create a date selector UI
            const strategyContainer = document.getElementById('strategy-builder-result');
            if (strategyContainer) {
                // Get all available expiration dates
                const expirationDates = new Set();

                // Debug log the first few options to see expiration_date format
                console.log("Sample options data:");
                const sampleOptions = this.optionsView.currentOptionsData.slice(0, 3);
                sampleOptions.forEach((opt, idx) => {
                    console.log(`Option ${idx+1}:`, {
                        expiration_date: opt.expiration_date,
                        formatted: this.optionsView.formatDate ? this.optionsView.formatDate(opt.expiration_date) : 'formatDate not available',
                        contract_type: opt.contract_type,
                        strike_price: opt.strike_price
                    });
                });

                this.optionsView.currentOptionsData.forEach(option => {
                    if (option.expiration_date) {
                        const formattedDate = this.optionsView.formatDate ?
                            this.optionsView.formatDate(option.expiration_date) :
                            option.expiration_date;
                        expirationDates.add(formattedDate);
                    }
                });

                console.log("Available expiration dates:", Array.from(expirationDates));

                // Create date selector UI
                let html = `
                    <div class="alert alert-info">
                        <p><strong>Please select a specific expiration date:</strong></p>
                        <select id="strategy-expiration-select" class="form-select mb-3">
                            <option value="" disabled selected>Select an expiration date</option>
                `;

                // Add options for each expiration date
                Array.from(expirationDates).sort().forEach(date => {
                    html += `<option value="${date}">${date}</option>`;
                });

                html += `
                        </select>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>Strategy Type:</strong> ${strategyType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            <button id="use-selected-expiration" class="btn btn-primary">
                                <i class="bi bi-check-circle"></i> Apply Selected Date
                            </button>
                        </div>
                    </div>
                `;

                strategyContainer.innerHTML = html;
                console.log("Date selector UI created");

                // Add event listener to the button
                setTimeout(() => {
                    const applyButton = document.getElementById('use-selected-expiration');
                    if (applyButton) {
                        console.log("Adding event listener to Apply button");
                        applyButton.addEventListener('click', () => {
                            const selectedDate = document.getElementById('strategy-expiration-select')?.value;
                            console.log("Selected date:", selectedDate);

                            if (selectedDate) {
                                // Filter options for the selected expiration
                                const expirationOptions = this.optionsView.currentOptionsData.filter(opt =>
                                    this.optionsView.formatDate(opt.expiration_date) === selectedDate
                                );

                                console.log(`Found ${expirationOptions.length} options for ${selectedDate}`);

                                // Continue with strategy building using the filtered options
                                this.buildStrategyWithOptions(strategyType, expirationOptions, currentPrice, selectedDate);
                            } else {
                                if (window.App && App.showNotification) {
                                    App.showNotification('Please select an expiration date', 'warning');
                                } else {
                                    alert('Please select an expiration date');
                                }
                            }
                        });
                    } else {
                        console.error("Apply button not found!");
                    }
                }, 100);

                return;
            }
        }

        // If a specific expiration date tab is already active, proceed with normal strategy building
        const expDate = activeTab.textContent.trim();
        console.log(`Using expiration date from active tab: ${expDate}`);

        // Filter options for the selected expiration
        const expirationOptions = this.optionsView.currentOptionsData.filter(opt =>
            this.optionsView.formatDate(opt.expiration_date) === expDate
        );

        console.log(`Found ${expirationOptions.length} options for ${expDate}`);

        if (expirationOptions.length === 0) {
            if (window.App && App.showNotification) {
                App.showNotification('No options data found for the selected expiration date', 'warning');
            } else {
                alert('No options data found for the selected expiration date');
            }
            return;
        }

        // Continue with strategy building using the filtered options
        this.buildStrategyWithOptions(strategyType, expirationOptions, currentPrice, expDate);
    }

    /**
     * Build a strategy with specific options
     * @param {string} strategyType - Type of strategy to build
     * @param {Array} expirationOptions - Filtered options for a specific expiration
     * @param {number} currentPrice - Current stock price
     * @param {string} expDate - Expiration date
     */
    buildStrategyWithOptions(strategyType, expirationOptions, currentPrice, expDate) {
        console.log(`Building ${strategyType} strategy for ${expDate} with ${expirationOptions.length} options`);

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

        // Add expiration date to the strategy object for reference
        strategy.expirationDate = expDate;
        console.log("Strategy built:", strategy);

        // Store the strategy
        this.currentStrategy = strategy;

        // Display the strategy
        this.displayStrategy(strategy);
    }

    /**
     * Build a long call strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildLongCallStrategy(options, currentPrice) {
        console.log("Building long call strategy");

        // Find slightly OTM call
        const targetStrike = this.findClosestStrike(currentPrice * 1.05, options);
        console.log(`Target strike (current price * 1.05): ${targetStrike}`);

        const call = options.find(opt =>
            opt.contract_type === 'call' && parseFloat(opt.strike_price) === targetStrike
        );

        console.log("Found call option:", call ? "Yes" : "No");

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
            breakEven: parseFloat(call.strike_price) + parseFloat(call.last_price)
        };
    }

    /**
     * Build a long put strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildLongPutStrategy(options, currentPrice) {
        console.log("Building long put strategy");

        // Find slightly OTM put
        const targetStrike = this.findClosestStrike(currentPrice * 0.95, options);
        console.log(`Target strike (current price * 0.95): ${targetStrike}`);

        const put = options.find(opt =>
            opt.contract_type === 'put' && parseFloat(opt.strike_price) === targetStrike
        );

        console.log("Found put option:", put ? "Yes" : "No");

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
        const maxProfit = (parseFloat(put.strike_price) * 100) - cost; // If stock goes to 0

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
            breakEven: parseFloat(put.strike_price) - parseFloat(put.last_price)
        };
    }

    /**
     * Build a bull call spread strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildBullSpreadStrategy(options, currentPrice) {
        console.log("Building bull call spread strategy");

        // Find ATM call to buy
        const lowerStrike = this.findClosestStrike(currentPrice, options);
        const buyCall = options.find(opt =>
            opt.contract_type === 'call' && parseFloat(opt.strike_price) === lowerStrike
        );

        // Find OTM call to sell (about 10% higher)
        const higherStrike = this.findClosestStrike(currentPrice * 1.1, options);
        const sellCall = options.find(opt =>
            opt.contract_type === 'call' && parseFloat(opt.strike_price) === higherStrike
        );

        console.log(`Found buy call (strike ${lowerStrike}):`, buyCall ? "Yes" : "No");
        console.log(`Found sell call (strike ${higherStrike}):`, sellCall ? "Yes" : "No");

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

        const cost = (parseFloat(buyCall.last_price) - parseFloat(sellCall.last_price)) * 100;
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
    }

    /**
     * Build a bear put spread strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildBearSpreadStrategy(options, currentPrice) {
        console.log("Building bear put spread strategy");

        // Find ATM put to buy
        const higherStrike = this.findClosestStrike(currentPrice, options);
        const buyPut = options.find(opt =>
            opt.contract_type === 'put' && parseFloat(opt.strike_price) === higherStrike
        );

        // Find OTM put to sell (about 10% lower)
        const lowerStrike = this.findClosestStrike(currentPrice * 0.9, options);
        const sellPut = options.find(opt =>
            opt.contract_type === 'put' && parseFloat(opt.strike_price) === lowerStrike
        );

        console.log(`Found buy put (strike ${higherStrike}):`, buyPut ? "Yes" : "No");
        console.log(`Found sell put (strike ${lowerStrike}):`, sellPut ? "Yes" : "No");

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

        const cost = (parseFloat(buyPut.last_price) - parseFloat(sellPut.last_price)) * 100;
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
    }

    /**
     * Build an iron condor strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildIronCondorStrategy(options, currentPrice) {
        console.log("Building iron condor strategy");

        // Find put strikes (lower side of the condor)
        const putSellStrike = this.findClosestStrike(currentPrice * 0.9, options);
        const putBuyStrike = this.findClosestStrike(currentPrice * 0.8, options);

        // Find call strikes (upper side of the condor)
        const callSellStrike = this.findClosestStrike(currentPrice * 1.1, options);
        const callBuyStrike = this.findClosestStrike(currentPrice * 1.2, options);

        // Find the options
        const sellPut = options.find(opt =>
            opt.contract_type === 'put' && parseFloat(opt.strike_price) === putSellStrike
        );
        const buyPut = options.find(opt =>
            opt.contract_type === 'put' && parseFloat(opt.strike_price) === putBuyStrike
        );
        const sellCall = options.find(opt =>
            opt.contract_type === 'call' && parseFloat(opt.strike_price) === callSellStrike
        );
        const buyCall = options.find(opt =>
            opt.contract_type === 'call' && parseFloat(opt.strike_price) === callBuyStrike
        );

        console.log(`Found all 4 legs for iron condor: ${!!sellPut && !!buyPut && !!sellCall && !!buyCall}`);

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
        const credit = (parseFloat(sellPut.last_price) - parseFloat(buyPut.last_price) +
                        parseFloat(sellCall.last_price) - parseFloat(buyCall.last_price)) * 100;

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
    }

    /**
     * Build a butterfly spread strategy
     * @param {Array} options - Available options
     * @param {number} currentPrice - Current stock price
     * @returns {Object} - Strategy configuration
     */
    buildButterflyStrategy(options, currentPrice) {
        console.log("Building butterfly spread strategy");

        // Find strikes for butterfly (centered around the current price)
        const middleStrike = this.findClosestStrike(currentPrice, options);
        const lowerStrike = this.findClosestStrike(currentPrice * 0.95, options);
        const upperStrike = this.findClosestStrike(currentPrice * 1.05, options);

        // Find the options
        const lowerCall = options.find(opt =>
            opt.contract_type === 'call' && parseFloat(opt.strike_price) === lowerStrike
        );
        const middleCall1 = options.find(opt =>
            opt.contract_type === 'call' && parseFloat(opt.strike_price) === middleStrike
        );
        const middleCall2 = {...middleCall1}; // We need 2 of these
        const upperCall = options.find(opt =>
            opt.contract_type === 'call' && parseFloat(opt.strike_price) === upperStrike
        );

        console.log(`Found all legs for butterfly spread: ${!!lowerCall && !!middleCall1 && !!upperCall}`);

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
        const cost = (parseFloat(lowerCall.last_price) - 2 * parseFloat(middleCall1.last_price) + parseFloat(upperCall.last_price)) * 100;

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
    }

    /**
     * Display options strategy in the UI
     * @param {Object} strategy - Strategy configuration
     */
    displayStrategy(strategy) {
        console.log("Displaying strategy:", strategy);

        const strategyContainer = document.getElementById('strategy-builder-result');
        if (!strategyContainer) {
            console.error("Strategy container not found");
            return;
        }

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
                    <td>${this.formatCurrency(leg.strike)}</td>
                    <td>${this.formatCurrency(leg.price)}</td>
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
                            <p><strong>Expiration Date:</strong> ${strategy.expirationDate || strategy.legs[0]?.expiration || 'N/A'}</p>
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

        console.log("Strategy display complete");
    }

    /**
     * Export strategy to CSV
     */
    exportStrategy() {
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
    }

    /**
     * Clear current strategy
     */
    clearStrategy() {
        const strategyContainer = document.getElementById('strategy-builder-result');
        if (strategyContainer) {
            strategyContainer.innerHTML = '';
        }
        this.currentStrategy = null;
    }

    /**
     * Analyze option profit/loss
     * @param {Object} option - Option contract
     */
    analyzeOptionProfitLoss(option) {
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
    }

    /**
     * Add option to custom strategy
     * @param {Object} option - Option contract
     */
    addToCustomStrategy(option) {
        // Add leg to custom strategy
        this.customStrategy.legs.push({
            type: option.contract_type,
            action: 'buy', // Default action
            strike: option.strike_price,
            price: option.last_price,
            expiration: this.optionsView.formatDate(option.expiration_date)
        });

        // Display notification
        if (window.App && App.showNotification) {
            App.showNotification(`Added ${option.contract_type.toUpperCase()} ${option.strike_price} to custom strategy`, 'success');
        } else {
            alert(`Added ${option.contract_type.toUpperCase()} ${option.strike_price} to custom strategy`);
        }

        // Display the custom strategy
        this.displayCustomStrategy();
    }

    /**
     * Display the custom strategy
     */
    displayCustomStrategy() {
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

        // Save as current strategy
        this.currentStrategy = strategy;

        // Display the strategy
        this.displayStrategy(strategy);
    }

    /**
     * Update the strategy expiration dates dropdown
     */
    updateStrategyExpirationDates() {
        console.log("Updating strategy expiration dates dropdown");

        const expirationSelect = document.getElementById('strategy-expiration-date');
        if (!expirationSelect) {
            console.warn("Strategy expiration date select element not found");
            return;
        }

        // Clear existing options
        expirationSelect.innerHTML = '<option value="" selected disabled>Select an expiration date</option>';

        // Check if we have options data
        if (!this.optionsView.currentOptionsData || this.optionsView.currentOptionsData.length === 0) {
            console.warn("No options data available to populate expiration dates");
            return;
        }

        // Extract unique expiration dates
        const expirationDates = new Set();
        this.optionsView.currentOptionsData.forEach(option => {
            if (option.expiration_date) {
                const formattedDate = this.optionsView.formatDate(option.expiration_date);
                expirationDates.add(formattedDate);
            }
        });

        // Sort dates
        const sortedDates = Array.from(expirationDates).sort();
        console.log(`Found ${sortedDates.length} unique expiration dates`);

        // Add options to select dropdown
        sortedDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            expirationSelect.appendChild(option);
        });
    }

    /**
     * Find the strike price closest to the target price
     * @param {number} targetPrice - Target price to match
     * @param {Array} options - Array of option contracts
     * @returns {number} - Closest strike price
     */
    findClosestStrike(targetPrice, options) {
        // Get unique strike prices
        const strikes = [...new Set(options.map(opt => parseFloat(opt.strike_price)))];

        if (strikes.length === 0) {
            return targetPrice; // Return target price as fallback
        }

        // Find the closest strike
        let closestStrike = strikes[0];
        let minDiff = Math.abs(strikes[0] - targetPrice);

        strikes.forEach(strike => {
            const diff = Math.abs(strike - targetPrice);
            if (diff < minDiff) {
                minDiff = diff;
                closestStrike = strike;
            }
        });

        return closestStrike;
    }

    /**
     * Format currency value
     * @param {number} value - Value to format
     * @returns {string} - Formatted currency string
     */
    formatCurrency(value) {
        if (value === undefined || value === null) return 'N/A';
        return '$' + parseFloat(value).toFixed(2);
    }
}

// Use named export instead of default export
export { OptionsStrategiesModule };