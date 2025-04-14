/**
 * Options Data Manager
 *
 * Responsible for fetching, processing, and storing options data
 * Provides an interface for other components to access the data
 */
class OptionsDataManager {
    constructor() {
        // Main data storage - in-memory only for current session
        this.optionsData = {};
        this.lastUpdated = null;

        // Event handling
        this.eventHandlers = {
            'dataLoaded': [],
            'error': []
        };
    }

    /**
     * Fetch options data for a symbol
     * @param {string} symbol - Stock symbol
     * @param {boolean} includeGreeks - Whether to include Greeks data
     * @returns {Promise} - Promise resolving to the options data
     */
    async fetchOptionsData(symbol, includeGreeks = false) {
    try {
        console.log(`Fetching options data for ${symbol} (includeGreeks: ${includeGreeks})`);

        // Update UI to show loading state
        this.triggerEvent('loadingStarted', { symbol });

        // Make API request to your backend
        const response = await fetch(`/api/options/${symbol}?require_greeks=${includeGreeks}`);

        console.log("Response status:", response.status);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log("Options data received:", data);

        // Process the data
        this.processOptionsData(symbol, data);
        console.log("Processed data:", this.optionsData[symbol]);

        // Notify listeners
        this.triggerEvent('dataLoaded', {
            symbol,
            data: this.optionsData[symbol],
            fromCache: false
        });

        return this.optionsData[symbol];
    } catch (error) {
        console.error(`Error fetching options data for ${symbol}:`, error);
        this.triggerEvent('error', {
            symbol,
            error: error.message
        });
        throw error;
    }
}
    /**
     * Process and organize options data
     * @param {string} symbol - Stock symbol
     * @param {Array} data - Raw options data from API
     */
    processOptionsData(symbol, data) {
        // Check if data is an array directly or if it has a data property that's an array
        let optionsArray;

       if (Array.isArray(data)) {
        // API returned an array directly
        optionsArray = data;
        console.log("Sample option:", optionsArray[0]);
        console.log("Data is a direct array with length:", optionsArray.length);
    } else if (data && data.data && Array.isArray(data.data)) {
        // API returned {data: [...]} format
        optionsArray = data.data;
        console.log("Data is in data.data with length:", optionsArray.length);
    } else {
        console.error("Invalid data structure:", data);
        throw new Error('Invalid options data format received from API');
    }



        // Map fields to match UI expectations
        optionsArray = optionsArray.map(option => ({
            contractID: option.contract_name,
            type: option.contract_type,
            expiration: option.expiration_date,
            strike: option.strike_price,
            last: option.last_price,
            change: option.change,
            bid: option.bid,
            ask: option.ask,
            volume: option.volume,
            open_interest: option.open_interest,
            implied_volatility: option.implied_volatility,
            delta: option.delta,
            gamma: option.gamma,
            theta: option.theta,
            vega: option.vega
        }));

        // Store the raw data
        this.optionsData[symbol] = {
            raw: optionsArray,
            byExpiration: {},
            lastUpdated: new Date(),
            // Store the original response format for future reference
            originalResponse: data
        };

        // Organize options by expiration date
        optionsArray.forEach(option => {
            // Check for expiration_date or expiration property
            const expDate = option.expiration_date || option.expiration;

            if (!this.optionsData[symbol].byExpiration[expDate]) {
                this.optionsData[symbol].byExpiration[expDate] = {
                    calls: [],
                    puts: []
                };
            }

            // Check for contract_type or type property
            const contractType = (option.contract_type || option.type || '').toLowerCase();

            // Add to the appropriate array based on type
            if (contractType === 'call') {
                this.optionsData[symbol].byExpiration[expDate].calls.push(option);
            } else if (contractType === 'put') {
                this.optionsData[symbol].byExpiration[expDate].puts.push(option);
            }
        });

        // Sort options by strike price within each expiration
        for (const expDate in this.optionsData[symbol].byExpiration) {
            this.optionsData[symbol].byExpiration[expDate].calls.sort((a, b) =>
                parseFloat(a.strike_price || a.strike) - parseFloat(b.strike_price || b.strike)
            );

            this.optionsData[symbol].byExpiration[expDate].puts.sort((a, b) =>
                parseFloat(a.strike_price || a.strike) - parseFloat(b.strike_price || b.strike)
            );
        }

        // Calculate summary metrics
        this.calculateMetrics(symbol);

        this.lastUpdated = new Date();
    }

    /**
     * Calculate summary metrics for the options data
     * @param {string} symbol - Stock symbol
     */
    calculateMetrics(symbol) {
        if (!this.optionsData[symbol]) return;

        const data = this.optionsData[symbol];

        // Initialize metrics object
        data.metrics = {
            totalCalls: 0,
            totalPuts: 0,
            putCallRatio: 0,
            expirationDates: [],
            averageIV: null,
            volumeByExpiration: {}
        };

        // Count total calls and puts
        data.raw.forEach(option => {
            if (option.type === 'call') {
                data.metrics.totalCalls++;
            } else if (option.type === 'put') {
                data.metrics.totalPuts++;
            }
        });

        // Calculate put/call ratio
        if (data.metrics.totalCalls > 0) {
            data.metrics.putCallRatio = data.metrics.totalPuts / data.metrics.totalCalls;
        }

        // Get all expiration dates
        data.metrics.expirationDates = Object.keys(data.byExpiration).sort();

        // Calculate volume by expiration
        data.metrics.expirationDates.forEach(expDate => {
            const expData = data.byExpiration[expDate];
            let callVolume = 0;
            let putVolume = 0;

            expData.calls.forEach(call => callVolume += parseInt(call.volume) || 0);
            expData.puts.forEach(put => putVolume += parseInt(put.volume) || 0);

            data.metrics.volumeByExpiration[expDate] = {
                calls: callVolume,
                puts: putVolume,
                total: callVolume + putVolume,
                ratio: callVolume > 0 ? putVolume / callVolume : 0
            };
        });
    }

    /**
     * Get all available expiration dates for a symbol
     * @param {string} symbol - Stock symbol
     * @returns {Array} - Array of expiration dates
     */
    getExpirationDates(symbol) {
        if (!this.optionsData[symbol]) return [];
        return this.optionsData[symbol].metrics.expirationDates || [];
    }

    /**
     * Get options for a specific expiration date
     * @param {string} symbol - Stock symbol
     * @param {string} expirationDate - Expiration date
     * @returns {Object} - Options data for the expiration date
     */
    getOptionsForExpiration(symbol, expirationDate) {
        if (!this.optionsData[symbol] || !this.optionsData[symbol].byExpiration[expirationDate]) {
            return null;
        }

        return this.optionsData[symbol].byExpiration[expirationDate];
    }

    /**
     * Get options chain for a symbol
     * @param {string} symbol - Stock symbol
     * @returns {Object} - Complete options chain
     */
    getOptionsChain(symbol) {
        return this.optionsData[symbol] || null;
    }

    /**
     * Get metrics for a symbol
     * @param {string} symbol - Stock symbol
     * @returns {Object} - Options metrics
     */
    getMetrics(symbol) {
        if (!this.optionsData[symbol]) return null;
        return this.optionsData[symbol].metrics;
    }

    /**
     * Find the closest at-the-money options for a symbol and expiration
     * @param {string} symbol - Stock symbol
     * @param {string} expirationDate - Expiration date
     * @param {number} stockPrice - Current stock price
     * @returns {Object} - ATM call and put
     */
    findAtmOptions(symbol, expirationDate, stockPrice) {
        if (!this.optionsData[symbol] || !this.optionsData[symbol].byExpiration[expirationDate]) {
            return null;
        }

        const options = this.optionsData[symbol].byExpiration[expirationDate];

        // Find the strike price closest to current stock price
        let closestStrike = null;
        let minDiff = Infinity;

        // Check both calls and puts to find all available strike prices
        const allStrikes = new Set();

        options.calls.forEach(call => allStrikes.add(parseFloat(call.strike)));
        options.puts.forEach(put => allStrikes.add(parseFloat(put.strike)));

        // Convert to array and sort
        const sortedStrikes = Array.from(allStrikes).sort((a, b) => a - b);

        // Find closest strike
        sortedStrikes.forEach(strike => {
            const diff = Math.abs(strike - stockPrice);
            if (diff < minDiff) {
                minDiff = diff;
                closestStrike = strike;
            }
        });

        if (closestStrike === null) return null;

        // Find the call and put options with this strike
        const atmCall = options.calls.find(call => parseFloat(call.strike) === closestStrike);
        const atmPut = options.puts.find(put => parseFloat(put.strike) === closestStrike);

        return {
            strike: closestStrike,
            call: atmCall || null,
            put: atmPut || null
        };
    }

        /**
     * Calculate implied move based on ATM options and their greeks
     * @param {string} symbol - Stock symbol
     * @param {string} expirationDate - Expiration date
     * @param {number} stockPrice - Current stock price
     * @returns {Object} - Implied move data
     */
    calculateImpliedMove(symbol, expirationDate, stockPrice) {
        // Find ATM options
        const atm = this.findAtmOptions(symbol, expirationDate, stockPrice);

        if (!atm || !atm.call || !atm.put) {
            return null;
        }

        try {
            const call = atm.call;
            const put = atm.put;

            // Validate we have the necessary data
            if (!call.implied_volatility || !put.implied_volatility) {
                console.warn(`Missing implied volatility data for ${symbol} ATM options`);
            }

            // Calculate straddle price (using mid price if bid/ask available, otherwise last)
            const callPrice = call.bid && call.ask
                ? (parseFloat(call.bid) + parseFloat(call.ask)) / 2
                : parseFloat(call.last_price);

            const putPrice = put.bid && put.ask
                ? (parseFloat(put.bid) + parseFloat(put.ask)) / 2
                : parseFloat(put.last_price);

            if (isNaN(callPrice) || isNaN(putPrice)) {
                return null;
            }

            const straddlePrice = callPrice + putPrice;

            // Calculate days to expiry
            const today = new Date();
            const expiry = new Date(expirationDate);
            const daysToExpiry = Math.max(1, Math.round((expiry - today) / (1000 * 60 * 60 * 24)));
            const timeInYears = daysToExpiry / 365;

            // Calculate implied move using IV-weighted approach
            let impliedMove;

            if (call.implied_volatility && put.implied_volatility) {
                // Use delta-weighted average of call and put IVs for more accuracy
                const callIV = parseFloat(call.implied_volatility);
                const putIV = parseFloat(put.implied_volatility);

                // Get absolute delta values (should be between 0 and 1)
                const callDelta = call.delta ? Math.abs(parseFloat(call.delta)) : 0.5;
                const putDelta = put.delta ? Math.abs(parseFloat(put.delta)) : 0.5;

                // Weight the IVs by their deltas (options with higher deltas are more sensitive)
                const totalDelta = callDelta + putDelta;
                const weightedIV = (callIV * callDelta + putIV * putDelta) / totalDelta;

                // Calculate implied move based on volatility and time
                // Standard formula: IV * sqrt(time in years) = expected move in proportion to price
                impliedMove = weightedIV * Math.sqrt(timeInYears);
            } else {
                // Fallback to the simple straddle price method if no IV data
                impliedMove = straddlePrice / stockPrice;
            }

            // Calculate expected 1-standard-deviation range
            const lowerBound = stockPrice * (1 - impliedMove);
            const upperBound = stockPrice * (1 + impliedMove);

            // Calculate probability metrics using option greeks if available
            let probability = {};
            if (call.delta && put.delta) {
                // Use delta as a probability approximation
                // Delta of a call approximates probability of finishing ITM
                probability = {
                    aboveStrike: parseFloat(call.delta),
                    belowStrike: 1 - parseFloat(call.delta),
                    // Put delta is negative, so we take its absolute value
                    belowStrikeAlt: Math.abs(parseFloat(put.delta))
                };
            }

            return {
                strike: atm.strike,
                straddlePrice,
                impliedMove,
                impliedMovePercent: impliedMove * 100,
                daysToExpiry,
                expectedRange: {
                    low: lowerBound,
                    high: upperBound
                },
                probability: Object.keys(probability).length > 0 ? probability : undefined,
                calculationMethod: call.implied_volatility && put.implied_volatility ? 'implied_volatility' : 'straddle_price',
                // Include some of the raw data for reference
                rawData: {
                    callIV: call.implied_volatility ? parseFloat(call.implied_volatility) : undefined,
                    putIV: put.implied_volatility ? parseFloat(put.implied_volatility) : undefined,
                    callDelta: call.delta ? parseFloat(call.delta) : undefined,
                    putDelta: put.delta ? parseFloat(put.delta) : undefined,
                    timeToExpiryYears: timeInYears
                }
            };
        } catch (error) {
            console.error(`Error calculating implied move for ${symbol}:`, error);
            return null;
        }
    }
    /**
     * Calculate volatility skew for a specific expiration
     * @param {string} symbol - Stock symbol
     * @param {string} expirationDate - Expiration date
     * @returns {Object} - Volatility skew data
     */
    calculateVolatilitySkew(symbol, expirationDate) {
    if (!this.optionsData[symbol] || !this.optionsData[symbol].byExpiration[expirationDate]) {
        return null;
    }

    const options = this.optionsData[symbol].byExpiration[expirationDate];

    // Only calculate if we have implied_volatility data
    const hasIvData = options.calls.some(call => call.implied_volatility !== undefined) ||
                      options.puts.some(put => put.implied_volatility !== undefined);

    if (!hasIvData) {
        return null;
    }

    // Create data for skew chart
    const skewData = {
        calls: [],
        puts: []
    };

    // Process calls
    options.calls.forEach(call => {
        if (call.implied_volatility !== undefined) {
            skewData.calls.push({
                strike: parseFloat(call.strike_price),
                iv: parseFloat(call.implied_volatility)
            });
        }
    });

    // Process puts
    options.puts.forEach(put => {
        if (put.implied_volatility !== undefined) {
            skewData.puts.push({
                strike: parseFloat(put.strike_price),
                iv: parseFloat(put.implied_volatility)
            });
        }
    });

    // Sort by strike price
    skewData.calls.sort((a, b) => a.strike - b.strike);
    skewData.puts.sort((a, b) => a.strike - b.strike);

    return skewData;
}

    /**
     * Register event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        } else {
            this.eventHandlers[event] = [handler];
        }
    }

        /**
     * Trigger an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    triggerEvent(event, data) {
        console.log(`Triggering event: ${event}`, data);

        if (this.eventHandlers[event]) {
            console.log(`Found ${this.eventHandlers[event].length} handlers for event: ${event}`);

            this.eventHandlers[event].forEach((handler, index) => {
                try {
                    console.log(`Executing handler ${index + 1} for event: ${event}`);
                    handler(data);
                    console.log(`Handler ${index + 1} executed successfully`);
                } catch (error) {
                    console.error(`Error in event handler ${index + 1} for ${event}:`, error);
                }
            });
        } else {
            console.warn(`No handlers registered for event: ${event}`);
        }

        if (event === 'dataLoaded') {
            console.log("Data loaded event data:", data);
            // Debug specifically what's in the options data
            if (data && data.symbol && this.optionsData[data.symbol]) {
                console.log("Options data structure:", {
                    hasRawData: !!this.optionsData[data.symbol].raw,
                    rawDataLength: this.optionsData[data.symbol].raw ? this.optionsData[data.symbol].raw.length : 0,
                    expirationDates: Object.keys(this.optionsData[data.symbol].byExpiration),
                    lastUpdated: this.optionsData[data.symbol].lastUpdated
                });
            }
      }
    }
}

// Export singleton instance
const optionsDataManager = new OptionsDataManager();
export default optionsDataManager;