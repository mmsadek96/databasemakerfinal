/**
 * Options Analytics Module
 * Responsible for calculating and displaying options analytics and metrics
 */
class OptionsAnalyticsModule {
    /**
     * Constructor
     * @param {Object} optionsView - Reference to the main options view
     */
    constructor(optionsView) {
        this.optionsView = optionsView;
    }

    /**
     * Initialize the options analytics module
     */
    initialize() {
        console.log("Options Analytics Module initialized");
    }

    /**
     * Update options analytics with current options data
     * @param {Array} data - Options data
     * @param {string} symbol - Stock symbol
     */
    updateOptionsAnalytics(data, symbol) {
        console.log("Updating options analytics with", data.length, "options for", symbol);

        // Show analytics section
        const optionsAnalytics = document.getElementById('options-analytics');
        if (optionsAnalytics) {
            optionsAnalytics.classList.remove('d-none');
            console.log("Options analytics section displayed");
        } else {
            console.error("Could not find options-analytics element!");
        }

        // Calculate total open interest and volume
        let totalCallOI = 0;
        let totalPutOI = 0;
        let totalCallVolume = 0;
        let totalPutVolume = 0;

        // Add debugging to trace how we're processing the data
        console.log("Processing options data for analytics calculations");

        let callCount = 0;
        let putCount = 0;

        data.forEach(option => {
            // Add type checking to handle potential data format issues
            if (!option || typeof option !== 'object') {
                console.warn("Invalid option data item:", option);
                return;
            }

            const contractType = option.contract_type?.toLowerCase();

            // Debug log every 10th option to avoid flooding the console
            if ((callCount + putCount) % 10 === 0) {
                console.log("Sample option:", JSON.stringify(option, null, 2));
            }

            if (contractType === 'call') {
                callCount++;
                totalCallOI += option.open_interest || 0;
                totalCallVolume += option.volume || 0;
            } else if (contractType === 'put') {
                putCount++;
                totalPutOI += option.open_interest || 0;
                totalPutVolume += option.volume || 0;
            } else {
                console.warn("Unknown option type:", contractType, "for option:", option);
            }
        });

        console.log(`Processed ${callCount} calls and ${putCount} puts`);
        console.log(`Total call volume: ${totalCallVolume}, Total put volume: ${totalPutVolume}`);
        console.log(`Total call OI: ${totalCallOI}, Total put OI: ${totalPutOI}`);

        // Calculate put/call ratios - avoid division by zero
        const putCallOIRatio = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : 'N/A';
        const putCallVolumeRatio = totalCallVolume > 0 ? (totalPutVolume / totalCallVolume).toFixed(2) : 'N/A';

        // Calculate average implied volatility
        let totalCallIV = 0;
        let countCallIV = 0;
        let totalPutIV = 0;
        let countPutIV = 0;

        data.forEach(option => {
            if (option.implied_volatility !== undefined && option.implied_volatility !== null) {
                if (option.contract_type === 'call') {
                    totalCallIV += parseFloat(option.implied_volatility);
                    countCallIV++;
                } else if (option.contract_type === 'put') {
                    totalPutIV += parseFloat(option.implied_volatility);
                    countPutIV++;
                }
            }
        });

        console.log(`IV stats - Calls: ${countCallIV} count, ${totalCallIV} total | Puts: ${countPutIV} count, ${totalPutIV} total`);

        const avgCallIV = countCallIV ? totalCallIV / countCallIV : 0;
        const avgPutIV = countPutIV ? totalPutIV / countPutIV : 0;
        const avgIV = (countCallIV + countPutIV) ? (totalCallIV + totalPutIV) / (countCallIV + countPutIV) : 0;

        // Calculate volatility skew (difference between put and call IV)
        const volSkew = avgPutIV - avgCallIV;

        console.log(`Average call IV: ${avgCallIV}, Average put IV: ${avgPutIV}, Vol skew: ${volSkew}`);

        // Count unique expiration dates
        const expirationDates = new Set();
        data.forEach(option => {
            if (option.expiration_date) {
                expirationDates.add(option.expiration_date);
            }
        });

        console.log(`Found ${expirationDates.size} unique expiration dates`);

        // Update analytics display - safely handling potential null elements
        this.safeUpdateElementText('total-call-oi', this.formatNumber(totalCallOI));
        this.safeUpdateElementText('total-put-oi', this.formatNumber(totalPutOI));
        this.safeUpdateElementText('put-call-oi-ratio', putCallOIRatio);
        this.safeUpdateElementText('total-call-volume', this.formatNumber(totalCallVolume));
        this.safeUpdateElementText('total-put-volume', this.formatNumber(totalPutVolume));
        this.safeUpdateElementText('put-call-volume-ratio', putCallVolumeRatio);
        this.safeUpdateElementText('avg-call-iv', (avgCallIV * 100).toFixed(2) + '%');
        this.safeUpdateElementText('avg-put-iv', (avgPutIV * 100).toFixed(2) + '%');
        this.safeUpdateElementText('volatility-skew', (volSkew * 100).toFixed(2) + '%');
        this.safeUpdateElementText('expiration-count', expirationDates.size);

        // Update the vol skew classification
        const skewElement = document.getElementById('skew-classification');
        if (skewElement) {
            if (volSkew > 0.03) {
                skewElement.textContent = 'Steep (Bearish)';
                skewElement.className = 'text-danger fw-bold';
            } else if (volSkew > 0.01) {
                skewElement.textContent = 'Normal';
                skewElement.className = 'text-primary fw-bold';
            } else if (volSkew > -0.01) {
                skewElement.textContent = 'Flat';
                skewElement.className = 'text-secondary fw-bold';
            } else {
                skewElement.textContent = 'Inverted (Bullish)';
                skewElement.className = 'text-success fw-bold';
            }
        }

        // Update sentiment indicator
        const putCallRatio = putCallVolumeRatio !== 'N/A' ? parseFloat(putCallVolumeRatio) : 1.0;
        const sentimentElement = document.getElementById('options-sentiment');
        if (sentimentElement) {
            if (putCallRatio > 1.5) {
                sentimentElement.textContent = 'Bearish';
                sentimentElement.className = 'text-danger fw-bold';
            } else if (putCallRatio > 1.0) {
                sentimentElement.textContent = 'Somewhat Bearish';
                sentimentElement.className = 'text-warning fw-bold';
            } else if (putCallRatio > 0.7) {
                sentimentElement.textContent = 'Neutral';
                sentimentElement.className = 'text-secondary fw-bold';
            } else if (putCallRatio > 0.5) {
                sentimentElement.textContent = 'Somewhat Bullish';
                sentimentElement.className = 'text-info fw-bold';
            } else {
                sentimentElement.textContent = 'Bullish';
                sentimentElement.className = 'text-success fw-bold';
            }
        }

        // Update implied move calculation
        this.updateImpliedMoveAnalysis();

        // Make sure to always create and initialize implied move container elements
        this.ensureImpliedMoveElements();
    }

    /**
     * Update volatility metrics based on stock data
     * @param {Array} stockData - Stock price data
     */
    updateVolatilityMetrics(stockData) {
        if (!stockData || stockData.length < 2) return;

        // Calculate historical volatility
        const historicalVolatility = this.calculateHistoricalVolatility(stockData);
        const histVolElement = document.getElementById('historical-volatility');
        if (histVolElement) {
            histVolElement.textContent = (historicalVolatility * 100).toFixed(2) + '%';
        }
    }

    /**
     * Calculate historical volatility from stock data
     * @param {Array} stockData - Array of stock price data
     * @returns {number} - Annualized historical volatility
     */
    calculateHistoricalVolatility(stockData) {
        if (!stockData || stockData.length < 2) return 0;

        // Calculate daily returns
        const returns = [];
        for (let i = 1; i < stockData.length; i++) {
            const previousClose = stockData[i-1].close;
            const currentClose = stockData[i].close;
            returns.push(Math.log(currentClose / previousClose));
        }

        // Calculate standard deviation of returns
        const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
        const squaredDiffs = returns.map(value => Math.pow(value - mean, 2));
        const variance = squaredDiffs.reduce((sum, value) => sum + value, 0) / squaredDiffs.length;
        const stdDev = Math.sqrt(variance);

        // Annualize (assuming ~252 trading days in a year)
        return stdDev * Math.sqrt(252);
    }

    /**
     * Ensure that all required DOM elements for implied move analysis exist
     */
    ensureImpliedMoveElements() {
        // Get the container
        const container = document.getElementById('implied-move-container');
        if (!container) {
            console.error("Implied move container not found");
            return false;
        }

        // Make container visible if hidden
        if (container.classList.contains('d-none')) {
            container.classList.remove('d-none');
        }

        // Check required elements
        const requiredElements = [
            'implied-move',
            'expected-range',
            'days-to-expiry',
            'straddle-price',
            'current-stock-price-move'
        ];

        // Create missing elements if needed
        requiredElements.forEach(id => {
            if (!document.getElementById(id)) {
                console.log(`Creating missing element: ${id}`);
                const element = document.createElement('span');
                element.id = id;
                element.className = 'fw-bold';
                element.textContent = '0.00%';

                // Find container by convention
                const parentContainer = Array.from(container.querySelectorAll('.metric-group'))
                .find(el => el.textContent.includes(id.replace(/-/g, ' ')))
                || container.querySelector('.metric-group');

                if (parentContainer) {
                    const existingParent = Array.from(container.querySelectorAll('.d-flex'))
                        .find(el => el.innerHTML.includes(id.replace(/-/g, ' ')));

                    if (existingParent) {
                        existingParent.appendChild(element);
                    } else {
                        console.warn(`Could not find parent for ${id}, using default placement`);
                        const firstMetricGroup = container.querySelector('.metric-group');
                        if (firstMetricGroup) {
                            firstMetricGroup.appendChild(element);
                        }
                    }
                }
            }
        });

        return true;
    }

    /**
     * Update the implied move analysis based on ATM options
     */
    updateImpliedMoveAnalysis() {
        console.log("Updating implied move analysis");

        // Make sure we have options data and stock data
        if (!this.optionsView || !this.optionsView.currentOptionsData || !this.optionsView.stockData) {
            console.error("Missing required data for implied move analysis");
            return;
        }

        // First ensure all required elements exist
        this.ensureImpliedMoveElements();

        // Get current stock price
        const stockData = this.optionsView.stockData;
        if (!stockData || stockData.length === 0) {
            console.error("Stock data is empty");
            return;
        }

        const lastDataPoint = stockData[stockData.length - 1];
        console.log("Last stock data point:", lastDataPoint);

        const currentPrice = parseFloat(lastDataPoint.close);
        console.log("Current stock price:", currentPrice);

        if (isNaN(currentPrice) || currentPrice <= 0) {
            console.error("Invalid current price:", currentPrice);
            return;
        }

        // Check for options data
        const options = this.optionsView.currentOptionsData;
        if (!options || options.length === 0) {
            console.error("No options data available");
            return;
        }

        // Get the active tab directly from the DOM
        const activeTab = document.querySelector('#options-tabs .nav-link.active');
        if (!activeTab) {
            console.error("No active tab found");
            return;
        }

        const expDate = activeTab.textContent.trim();
        console.log("Active expiration tab:", expDate);

        // Force update current stock price display
        this.safeUpdateElementText('current-stock-price-move', '$' + currentPrice.toFixed(2));

        if (expDate === 'All Expirations') {
            console.warn("All Expirations tab is active - provide instructions");

            // Find the first available expiration tab
            const firstExpTab = document.querySelector('#options-tabs .nav-link:not(.active)');
            let message = "Select a specific expiration";

            if (firstExpTab) {
                const tabText = firstExpTab.textContent.trim();
                message = `Select "${tabText}" or another date tab to see implied move`;

                // Highlight the first expiration tab temporarily
                firstExpTab.classList.add('btn-outline-primary');
                setTimeout(() => {
                    firstExpTab.classList.remove('btn-outline-primary');
                }, 2000);
            }

            this.safeUpdateElementText('implied-move', "Select date");
            this.safeUpdateElementText('expected-range', message);

            // Update the info alert box to provide clearer instructions
            const infoAlert = document.querySelector('#implied-move-container .alert');
            if (infoAlert) {
                infoAlert.innerHTML = `
                    <i class="bi bi-info-circle"></i>
                    Please select a specific expiration date tab above to see the implied move analysis.
                    The implied move shows the market's expectation of price movement before expiration.
                `;
            }

            return;
        }

        // Filter options for current expiration date
        const formatDate = this.optionsView.formatDate || (d => d);  // Get format function or use identity

        console.log("Looking for options with expiration matching:", expDate);
        console.log("First few options:", options.slice(0, 3));

        // Try different ways to match the expiration
        const expirationOptions = options.filter(opt => {
            // Convert option's expiration to the same format as displayed in tab
            const formattedDate = formatDate(opt.expiration_date);
            return formattedDate === expDate || opt.expiration_date === expDate;
        });

        console.log(`Found ${expirationOptions.length} options for expiration ${expDate}`);

        if (expirationOptions.length === 0) {
            console.error(`No options found for expiration: ${expDate}`);
            return;
        }

        // Find ATM strike
        console.log("Finding ATM strike for price:", currentPrice);
        console.log("Available strikes:", expirationOptions.map(o => o.strike_price).slice(0, 10));

        // Get unique strikes
        const strikes = [...new Set(expirationOptions.map(o => parseFloat(o.strike_price)))].sort((a, b) => a - b);

        if (strikes.length === 0) {
            console.error("No valid strike prices found");
            return;
        }

        // Find closest strike to current price
        let closestStrike = strikes[0];
        let minDiff = Math.abs(strikes[0] - currentPrice);

        strikes.forEach(strike => {
            const diff = Math.abs(strike - currentPrice);
            if (diff < minDiff) {
                minDiff = diff;
                closestStrike = strike;
            }
        });

        console.log(`Closest strike to ${currentPrice} is ${closestStrike}`);

        // Find ATM options
        const atmCall = expirationOptions.find(opt =>
            opt.contract_type === 'call' && parseFloat(opt.strike_price) === closestStrike
        );

        const atmPut = expirationOptions.find(opt =>
            opt.contract_type === 'put' && parseFloat(opt.strike_price) === closestStrike
        );

        console.log("ATM call:", atmCall ? "Found" : "Not found");
        console.log("ATM put:", atmPut ? "Found" : "Not found");

        if (!atmCall || !atmPut) {
            console.error("Could not find both ATM call and put options");
            return;
        }

        // Calculate days to expiry
        const today = new Date();
        const expiry = new Date(atmCall.expiration_date);
        const daysToExpiry = Math.max(1, Math.round((expiry - today) / (1000 * 60 * 60 * 24)));

        console.log(`Days to expiry: ${daysToExpiry}`);

        // Calculate implied move
        const callPrice = parseFloat(atmCall.last_price);
        const putPrice = parseFloat(atmPut.last_price);

        if (isNaN(callPrice) || isNaN(putPrice)) {
            console.error("Invalid option prices", {callPrice, putPrice});
            return;
        }

        const straddle = callPrice + putPrice;
        const impliedMove = straddle / currentPrice;

        console.log(`Straddle price: $${straddle.toFixed(2)}, Implied move: ${(impliedMove * 100).toFixed(2)}%`);

        // Update display
        this.safeUpdateElementText('implied-move', (impliedMove * 100).toFixed(2) + '%');
        this.safeUpdateElementText('straddle-price', '$' + straddle.toFixed(2));
        this.safeUpdateElementText('days-to-expiry', daysToExpiry);

        const lowRange = currentPrice * (1 - impliedMove);
        const highRange = currentPrice * (1 + impliedMove);
        this.safeUpdateElementText('expected-range', `$${lowRange.toFixed(2)} - $${highRange.toFixed(2)}`);

        // Historical volatility
        const historicalVol = document.getElementById('historical-volatility');
        const histVolValue = historicalVol ? historicalVol.textContent : '0.00%';
        this.safeUpdateElementText('historical-vol', histVolValue);

        // Make sure container is visible
        const moveContainer = document.getElementById('implied-move-container');
        if (moveContainer) {
            moveContainer.classList.remove('d-none');
        }

        // Reset the info alert to the standard text
        const infoAlert = document.querySelector('#implied-move-container .alert');
        if (infoAlert) {
            infoAlert.innerHTML = `
                <i class="bi bi-info-circle"></i>
                The implied move is calculated based on the At-The-Money straddle pricing.
                This represents the market's expectation of price movement before expiration.
            `;
        }

        // Add at the end of updateImpliedMoveAnalysis
        console.log("Current DOM values:");
        console.log("implied-move:", document.getElementById('implied-move')?.textContent);
        console.log("expected-range:", document.getElementById('expected-range')?.textContent);
        console.log("days-to-expiry:", document.getElementById('days-to-expiry')?.textContent);
        console.log("straddle-price:", document.getElementById('straddle-price')?.textContent);

        return true;  // Successfully updated
    }

    /**
     * Helper method to safely update element text content
     * @param {string} elementId - ID of element to update
     * @param {string} text - Text to set
     */
    safeUpdateElementText(elementId, text) {
        // Try finding element directly
        let element = document.getElementById(elementId);

        // If not found, try looking within the implied move container
        if (!element) {
            const container = document.getElementById('implied-move-container');
            if (container) {
                element = container.querySelector(`#${elementId}`);
            }
        }

        if (element) {
            element.textContent = text;
            console.log(`Updated ${elementId} to "${text}"`);
        } else {
            console.warn(`Element ${elementId} not found`);
        }
    }

    /**
     * Format number with commas
     * @param {number} value - Value to format
     * @returns {string} - Formatted number string
     */
    formatNumber(value) {
        if (value === undefined || value === null) return 'N/A';

        // Format with commas
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}

export { OptionsAnalyticsModule };
