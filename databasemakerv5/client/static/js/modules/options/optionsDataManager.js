/**
 * Options Data Manager
 *
 * Responsible for fetching, processing, and storing options data
 * Provides an interface for other components to access the data
 */
class OptionsDataManager {
    constructor() {
        // Main data storage
        this.optionsData = {};
        this.stockData = {};
        this.lastUpdated = null;

        // Cache settings
        this.cacheExpiration = 15 * 60 * 1000; // 15 minutes in milliseconds

        // Event handling
        this.eventHandlers = {
            'dataLoaded': [],
            'error': []
        };

        // Initialize local storage if needed
        this.initializeStorage();
    }

    /**
     * Initialize local storage for options data
     */
    initializeStorage() {
        if (!localStorage.getItem('optionsCache')) {
            localStorage.setItem('optionsCache', JSON.stringify({}));
        }

        // Try to load any cached data
        try {
            const cachedData = JSON.parse(localStorage.getItem('optionsCache'));
            if (cachedData && cachedData.data && cachedData.timestamp) {
                // Check if cache is still valid (within expiration time)
                const now = new Date().getTime();
                if (now - cachedData.timestamp < this.cacheExpiration) {
                    this.optionsData = cachedData.data;
                    this.lastUpdated = new Date(cachedData.timestamp);
                    console.log('Loaded valid options data from cache');
                }
            }
        } catch (error) {
            console.error('Error loading cached options data:', error);
            // Reset cache if corrupted
            localStorage.setItem('optionsCache', JSON.stringify({}));
        }
    }

    /**
     * Save current options data to local storage
     */
    saveToCache() {
        const cacheData = {
            timestamp: new Date().getTime(),
            data: this.optionsData
        };

        try {
            localStorage.setItem('optionsCache', JSON.stringify(cacheData));
            console.log('Saved options data to cache');
        } catch (error) {
            console.error('Error saving options data to cache:', error);
            // If localStorage is full, clear it and try again
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                localStorage.clear();
                try {
                    localStorage.setItem('optionsCache', JSON.stringify(cacheData));
                } catch (retryError) {
                    console.error('Failed to save cache even after clearing localStorage:', retryError);
                }
            }
        }
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

            // Check if we have fresh data in cache
            if (this.hasValidCache(symbol)) {
                console.log(`Using cached data for ${symbol}`);
                this.triggerEvent('dataLoaded', {
                    symbol,
                    data: this.optionsData[symbol],
                    fromCache: true
                });
                return this.optionsData[symbol];
            }

            // Make API request to your backend
            const response = await fetch(`/api/options/${symbol}?require_greeks=${includeGreeks}`);

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();

                // ADD THIS DEBUGGING CODE
            console.log("API response data:", data);
            console.log("Data type:", typeof data);
            console.log("Is array?", Array.isArray(data));
            if (typeof data === 'object') {
                console.log("Object keys:", Object.keys(data));
                if (data.data) {
                    console.log("data.data is array?", Array.isArray(data.data));
                    console.log("First few items:", data.data.slice(0, 2));
                }
            }


            // Process and store the data
            this.processOptionsData(symbol, data);

            // Save to cache
            this.saveToCache();

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
     * Check if we have valid cached data for a symbol
     * @param {string} symbol - Stock symbol
     * @returns {boolean} - Whether valid cache exists
     */
    hasValidCache(symbol) {
        if (!this.optionsData[symbol] || !this.lastUpdated) {
            return false;
        }

        const now = new Date().getTime();
        const lastUpdate = this.lastUpdated.getTime();

        return (now - lastUpdate) < this.cacheExpiration;
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
    } else if (data && data.data && Array.isArray(data.data)) {
        // API returned {data: [...]} format
        optionsArray = data.data;
    } else {
        throw new Error('Invalid options data format received from API');
    }

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
     * Calculate implied move based on ATM straddle
     * @param {string} symbol - Stock symbol
     * @param {string} expirationDate - Expiration date
     * @param {number} stockPrice - Current stock price
     * @returns {Object} - Implied move data
     */
    calculateImpliedMove(symbol, expirationDate, stockPrice) {
        const atm = this.findAtmOptions(symbol, expirationDate, stockPrice);

        if (!atm || !atm.call || !atm.put) {
            return null;
        }

        // Calculate straddle price
        const straddlePrice = parseFloat(atm.call.last) + parseFloat(atm.put.last);

        // Calculate implied move as percentage
        const impliedMove = straddlePrice / stockPrice;

        // Calculate expiration days
        const today = new Date();
        const expiry = new Date(expirationDate);
        const daysToExpiry = Math.max(1, Math.round((expiry - today) / (1000 * 60 * 60 * 24)));

        // Calculate expected range
        const lowerBound = stockPrice * (1 - impliedMove);
        const upperBound = stockPrice * (1 + impliedMove);

        return {
            strike: atm.strike,
            straddlePrice,
            impliedMove,
            impliedMovePercent: impliedMove * 100,
            daysToExpiry,
            expectedRange: {
                low: lowerBound,
                high: upperBound
            }
        };
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
                    strike: parseFloat(call.strike),
                    iv: parseFloat(call.implied_volatility)
                });
            }
        });

        // Process puts
        options.puts.forEach(put => {
            if (put.implied_volatility !== undefined) {
                skewData.puts.push({
                    strike: parseFloat(put.strike),
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
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Clear cached data for a symbol
     * @param {string} symbol - Stock symbol
     */
    clearCache(symbol) {
        if (symbol) {
            // Clear specific symbol
            if (this.optionsData[symbol]) {
                delete this.optionsData[symbol];
                console.log(`Cleared cache for ${symbol}`);
            }
        } else {
            // Clear all data
            this.optionsData = {};
            console.log('Cleared all cached options data');
        }

        // Update local storage
        this.saveToCache();
    }
}

// Export singleton instance
const optionsDataManager = new OptionsDataManager();
export default optionsDataManager;