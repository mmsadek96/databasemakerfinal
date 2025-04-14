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

    /**
     * Get current API key
     * @returns {Promise<Object>} - Promise resolving to API key
     */
    async getApiKey() {
        return this.get('/api/apikey');
    },

    /**
     * Update API key
     * @param {string} apiKey - New API key
     * @returns {Promise<Object>} - Promise resolving to result
     */
    async updateApiKey(apiKey) {
        return this.post('/api/apikey', {
            apikey: apiKey
        });
    }
};

export default API;