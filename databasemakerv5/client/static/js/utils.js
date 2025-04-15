/**
 * Utility functions for Financial Intelligence Hub
 * @module utils
 */

/**
 * Format currency value
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(value, decimals = 2) {
    if (value === undefined || value === null) return 'N/A';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

/**
 * Format percentage value
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage string
 */
export function formatPercentage(value, decimals = 2) {
    if (value === undefined || value === null) return 'N/A';

    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value / 100);
}

/**
 * Format number with commas
 * @param {number} value - Value to format
 * @returns {string} - Formatted number string
 */
export function formatNumber(value) {
    if (value === undefined || value === null) return 'N/A';

    return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'medium', 'long')
 * @returns {string} - Formatted date string
 */
export function formatDate(date, format = 'medium') {
    if (!date) return 'N/A';

    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const options = {
        short: { year: 'numeric', month: 'numeric', day: 'numeric' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    };

    return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Debounce function to limit frequent calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Debounce time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Calculate Simple Moving Average
 * @param {Array} data - Data array
 * @param {string} field - Field to calculate SMA for
 * @param {number} period - Period for SMA
 * @returns {Array} - SMA values
 */
export function calculateSMA(data, field, period) {
    const result = [];

    // Need at least 'period' data points
    if (data.length < period) return result;

    // Calculate SMA for each point after we have 'period' points
    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((total, item) => total + parseFloat(item[field]), 0);
        result.push({
            date: data[i].date,
            value: sum / period
        });
    }

    return result;
}

/**
 * Get appropriate CSS class for sentiment value
 * @param {number} sentiment - Sentiment value (-1 to 1)
 * @returns {string} - CSS class name
 */
export function getSentimentClass(sentiment) {
    if (sentiment >= 0.5) return 'sentiment-very-positive';
    if (sentiment >= 0.1) return 'sentiment-positive';
    if (sentiment <= -0.5) return 'sentiment-very-negative';
    if (sentiment <= -0.1) return 'sentiment-negative';
    return 'sentiment-neutral';
}

/**
 * Format sentiment text
 * @param {number} sentiment - Sentiment value (-1 to 1)
 * @returns {string} - Descriptive text
 */
export function formatSentimentText(sentiment) {
    if (sentiment >= 0.5) return "very positive";
    if (sentiment >= 0.1) return "positive";
    if (sentiment <= -0.5) return "very negative";
    if (sentiment <= -0.1) return "negative";
    return "neutral";
}

/**
 * Extract metrics from analysis text
 * @param {string} text - Analysis text
 * @returns {Array} - Extracted metrics
 */
export function extractMetricsFromText(text) {
    const metrics = [];

    // Look for percentage patterns
    const percentageMatches = text.match(/(\d+(\.\d+)?%)|(\d+(\.\d+)?\s?percent)/g) || [];
    const dollarMatches = text.match(/\$\d+(.\d+)?\s?(million|billion|B|M)?/g) || [];

    // Try to find labeled metrics
    const metricPatterns = [
        { pattern: /revenue\s+growth\s+of\s+(\d+(\.\d+)?%)/i, label: 'Revenue Growth' },
        { pattern: /(gross|operating|profit|EBITDA)\s+margin\s+of\s+(\d+(\.\d+)?%)/i, label: null },
        { pattern: /guidance\s+of\s+(\d+(\.\d+)?%)/i, label: 'Guidance' },
        { pattern: /EPS\s+of\s+\$(\d+(\.\d+)?)/i, label: 'EPS' }
    ];

    for (const { pattern, label } of metricPatterns) {
        const match = text.match(pattern);
        if (match) {
            const value = match[1] || match[2];
            const isPercentage = value.includes('%');
            const cleanValue = isPercentage ? parseFloat(value.replace('%', '')) : value;

            metrics.push({
                label: label || match[1].charAt(0).toUpperCase() + match[1].slice(1) + ' Margin',
                value: cleanValue,
                isPercentage
            });
        }
    }

    // If we still need metrics, use generic patterns
    if (metrics.length < 3) {
        // Add generic metrics based on patterns found
        if (percentageMatches.length > 0) {
            metrics.push({
                label: 'Growth Rate',
                value: parseFloat(percentageMatches[0].replace('%', '').replace('percent', '')),
                isPercentage: true
            });
        }

        if (dollarMatches.length > 0 && metrics.length < 3) {
            metrics.push({
                label: 'Revenue',
                value: dollarMatches[0],
                isPercentage: false
            });
        }
    }

    return metrics;
}

export default {
    formatCurrency,
    formatPercentage,
    formatNumber,
    formatDate,
    formatFileSize,
    debounce,
    calculateSMA,
    getSentimentClass,
    formatSentimentText,
    extractMetricsFromText
};