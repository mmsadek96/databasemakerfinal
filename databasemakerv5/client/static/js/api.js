/**
 * API Client for Financial Intelligence Hub
 * @module api
 */

/**
 * API client for making requests to the server
 */
const API = {
    /**
     * Base API URL
     */
    BASE_URL: '',

    /**
     * Make a GET request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} - Promise resolving to response data
     */
    async get(endpoint, params = {}) {
        try {
            // Build query string from params object
            const queryParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (Array.isArray(value)) {
                    // Handle array parameters
                    value.forEach(val => queryParams.append(key, val));
                } else if (value !== undefined && value !== null) {
                    queryParams.append(key, value);
                }
            }

            const queryString = queryParams.toString();
            const url = `${this.BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Make a POST request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise<Object>} - Promise resolving to response data
     */
    async post(endpoint, data = {}) {
        try {
            const url = `${this.BASE_URL}${endpoint}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Search for stock symbols
     * @param {string} keywords - Search keywords
     * @returns {Promise<Object[]>} - Promise resolving to search results
     */
    async searchSymbols(keywords) {
        return this.get(`/api/search/${encodeURIComponent(keywords)}`);
    },

    /**
     * Get stock data for a symbol
     * @param {string} symbol - Stock symbol
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Object[]>} - Promise resolving to stock data
     */
    async getStockData(symbol, startDate, endDate) {
        return this.get(`/api/stock/${symbol}`, {
            start_date: startDate,
            end_date: endDate
        });
    },

    /**
     * Get economic indicator data
     * @param {string} indicator - Indicator name
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Object[]>} - Promise resolving to indicator data
     */
    async getIndicatorData(indicator, startDate, endDate) {
        return this.get(`/api/indicator/${indicator}`, {
            start_date: startDate,
            end_date: endDate
        });
    },

    /**
     * Get list of available indicators
     * @returns {Promise<Object>} - Promise resolving to available indicators
     */
    async getAvailableIndicators() {
        return this.get('/api/available/indicators');
    },

    /**
     * Get options data for a symbol
     * @param {string} symbol - Stock symbol
     * @param {boolean} requireGreeks - Whether to include Greeks values
     * @returns {Promise<Object[]>} - Promise resolving to options data
     */
    async getOptionsData(symbol, requireGreeks = false) {
        return this.get(`/api/options/${symbol}`, {
            require_greeks: requireGreeks
        });
    },

    /**
     * Get options suggestions from database
     * @param {string} symbol - Stock symbol
     * @param {string} expirationDate - Expiration date
     * @returns {Promise<Object>} - Promise resolving to options suggestions
     */
    async getOptionsSuggestions(symbol, expirationDate) {
        return this.get(`/api/analyze/options/${symbol}`, {
            expiration_date: expirationDate
        });
    },

    /**
     * Generate options suggestions using AI
     * @param {Object} data - Analysis request data
     * @returns {Promise<Object>} - Promise resolving to options suggestions
     */
    async generateOptionsSuggestions(data) {
        return this.post('/api/analyze/options', data);
    },

    /**
     * Get correlation data for selected stocks and indicators
     * @param {string[]} stocks - Stock symbols
     * @param {string[]} indicators - Indicator names
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<Object>} - Promise resolving to correlation data
     */
    async getCorrelation(stocks, indicators, startDate, endDate) {
        return this.get('/api/correlation', {
            stocks: stocks,
            indicators: indicators,
            start_date: startDate,
            end_date: endDate
        });
    },

    /**
     * Get transcript analysis for a symbol
     * @param {string} symbol - Stock symbol
     * @param {string} quarter - Quarter in YYYYQN format
     * @param {boolean} analyzePastQuarters - Whether to analyze past quarters
     * @param {number} numQuarters - Number of quarters to analyze
     * @param {boolean} includeFinancials - Whether to include financial data
     * @returns {Promise<Object>} - Promise resolving to transcript analysis
     */
    async getTranscriptAnalysis(symbol, quarter, analyzePastQuarters, numQuarters, includeFinancials) {
        return this.get(`/api/earnings/analyze/${symbol}`, {
            quarter: quarter,
            analyze_past_quarters: analyzePastQuarters,
            num_quarters: numQuarters,
            include_financials: includeFinancials
        });
    },

    /**
     * Get market movers data
     * @returns {Promise<Object>} - Promise resolving to market movers data
     */
    async getMarketMovers() {
        return this.get('/api/market/movers');
    },

    // Binance API endpoints

    /**
     * Set Binance API credentials
     * @param {string} apiKey - Binance API key
     * @param {string} apiSecret - Binance API secret
     * @param {string[]} allowedIps - List of allowed IP addresses
     * @returns {Promise<Object>} - Promise resolving to result
     */
    async setBinanceCredentials(apiKey, apiSecret, allowedIps = []) {
        return this.post('/api/binance/set-credentials', {
            api_key: apiKey,
            api_secret: apiSecret,
            allowed_ips: allowedIps
        });
    },

    /**
     * Test connection to Binance API
     * @returns {Promise<Object>} - Promise resolving to connection test result
     */
    async testBinanceConnection() {
        return this.get('/api/binance/test-connection');
    },

    /**
     * Get Binance account information
     * @returns {Promise<Object>} - Promise resolving to account information
     */
    async getBinanceAccount() {
        return this.get('/api/binance/account');
    },

    /**
     * Get open orders from Binance
     * @param {string} symbol - Optional symbol to filter by
     * @returns {Promise<Object[]>} - Promise resolving to open orders
     */
    async getBinanceOpenOrders(symbol = null) {
        return this.get('/api/binance/open-orders', symbol ? {symbol} : {});
    },

    /**
     * Get available trading pairs from Binance
     * @returns {Promise<Object[]>} - Promise resolving to trading pairs
     */
    async getBinanceTradingPairs() {
        return this.get('/api/binance/trading-pairs');
    },

    /**
     * Get IP status for Binance API restrictions
     * @returns {Promise<Object>} - Promise resolving to IP status
     */
    async getBinanceIpStatus() {
        return this.get('/api/binance/ip-status');
    },

    // IBKR API Methods

    /**
     * Get IBKR account summary
     * @returns {Promise<Object>} - Promise resolving to account summary data
     */
    async getIBKRAccountSummary() {
        return this.get('/api/ibkr/account/summary');
    },

    /**
     * Get IBKR positions
     * @returns {Promise<Object[]>} - Promise resolving to positions data
     */
    async getIBKRPositions() {
        return this.get('/api/ibkr/positions');
    },

    /**
     * Get IBKR orders
     * @param {string} status - Order status filter (active, completed, canceled)
     * @returns {Promise<Object[]>} - Promise resolving to orders data
     */
    async getIBKROrders(status = 'active') {
        return this.get('/api/ibkr/orders', {status});
    },

    /**
     * Get IBKR trade history
     * @param {number} days - Number of days of history
     * @returns {Promise<Object[]>} - Promise resolving to trade history data
     */
    async getIBKRTradeHistory(days = 30) {
        return this.get('/api/ibkr/trades', {days});
    },

    /**
     * Place IBKR order
     * @param {Object} orderData - Order details
     * @returns {Promise<Object>} - Promise resolving to order result
     */
    async placeIBKROrder(orderData) {
        return this.post('/api/ibkr/orders', orderData);
    },

    /**
     * Get IBKR account performance
     * @param {string} period - Time period (1D, 1W, 1M, 3M, 6M, 1Y, YTD)
     * @returns {Promise<Object>} - Promise resolving to performance data
     */
    async getIBKRPerformance(period = 'YTD') {
        return this.get('/api/ibkr/performance', {period});
    },

    /**
     * Search IBKR symbols
     * @param {string} query - Search query
     * @returns {Promise<Object[]>} - Promise resolving to search results
     */
    async searchIBKRSymbols(query) {
        return this.get('/api/ibkr/search', {query});
    },

    /**
 * Add these methods to the API object in api.js
 */

/**
 * Get technical indicator data for a symbol
 * @param {string} symbol - Stock symbol
 * @param {string} indicator - Technical indicator name
 * @param {Object} params - Optional parameters
 * @returns {Promise<Object[]>} - Promise resolving to indicator data
 */
async getTechnicalIndicator(symbol, indicator, params = {}) {
    const defaultParams = {
        time_period: 14,
        series_type: "close",
        interval: "daily"
    };

    // Combine default parameters with provided parameters
    const queryParams = { ...defaultParams, ...params };

    return this.get(`/api/technical/${symbol}/${indicator}`, queryParams);
},

/**
 * Get list of available technical indicators
 * @returns {Promise<Object>} - Promise resolving to available indicators
 */
async getAvailableTechnicalIndicators() {
    return this.get('/api/technical/available/list');
},

    /**
     * Get IBKR market data
     * @param {string[]} symbols - Symbol IDs
     * @param {string[]} fields - Data fields to retrieve
     * @returns {Promise<Object>} - Promise resolving to market data
     */
    async getIBKRMarketData(symbols, fields) {
        return this.get('/api/ibkr/market-data', {symbols, fields});
    },
}

export default API;