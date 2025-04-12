/**
 * Options analytics functions
 * @module options-analytics
 */

import { formatCurrency, formatNumber } from './utils.js';

/**
 * Options analytics controller
 */
const OptionsAnalytics = {
    /**
     * Reference to the main options view
     */
    optionsView: null,

    /**
     * Chart instances
     */
    volatilitySkewChart: null,
    putCallRatioChart: null,
    optionVolumeChart: null,

    /**
     * Initialize the options analytics module
     * @param {Object} optionsView - Reference to the main options view
     */
    initialize: function(optionsView) {
        this.optionsView = optionsView;
    },

    /**
     * Initialize chart instances when needed
     */
    initializeChartsIfNeeded: function() {
        // Volatility Skew Chart
        if (!this.volatilitySkewChart) {
            const skewCtx = document.getElementById('volatility-skew-chart');
            if (skewCtx) {
                this.volatilitySkewChart = new Chart(skewCtx.getContext('2d'), {
                    type: 'scatter',
                    data: {
                        datasets: [{
                            label: 'Calls IV',
                            data: [],
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            pointRadius: 5,
                        }, {
                            label: 'Puts IV',
                            data: [],
                            backgroundColor: 'rgba(255, 99, 132, 0.6)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            pointRadius: 5,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Volatility Skew',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const point = context.raw;
                                        return `Strike: ${point.x}, IV: ${(point.y * 100).toFixed(1)}%`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Strike Price ($)'
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Implied Volatility (%)'
                                },
                                ticks: {
                                    callback: function(value) {
                                        return (value * 100).toFixed(0) + '%';
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }

        // Put/Call Ratio Chart
        if (!this.putCallRatioChart) {
            const ratioCtx = document.getElementById('put-call-ratio-chart');
            if (ratioCtx) {
                this.putCallRatioChart = new Chart(ratioCtx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Put/Call Ratio',
                            data: [],
                            backgroundColor: 'rgba(153, 102, 255, 0.6)',
                            borderColor: 'rgba(153, 102, 255, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Put/Call Volume Ratio by Expiration',
                                font: { size: 16 }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Ratio'
                                }
                            }
                        }
                    }
                });
            }
        }

        // Option Volume Chart
        if (!this.optionVolumeChart) {
            const volumeCtx = document.getElementById('option-volume-chart');
            if (volumeCtx) {
                this.optionVolumeChart = new Chart(volumeCtx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Call Volume',
                            data: [],
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }, {
                            label: 'Put Volume',
                            data: [],
                            backgroundColor: 'rgba(255, 99, 132, 0.6)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Option Volume by Strike',
                                font: { size: 16 }
                            }
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Strike Price ($)'
                                }
                            },
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Volume'
                                }
                            }
                        }
                    }
                });
            }
        }
    },

    /**
     * Calculate historical volatility from stock data
     * @param {Array} stockData - Array of stock price data
     * @returns {number} - Annualized historical volatility
     */
    calculateHistoricalVolatility: function(stockData) {
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
    },

    /**
     * Update options analytics with advanced institutional metrics
     * @param {Array} data - Options data
     * @param {string} symbol - Stock symbol
     */
    updateOptionsAnalytics: function(data, symbol) {
        // Show analytics section
        const optionsAnalytics = document.getElementById('options-analytics');
        if (optionsAnalytics) {
            optionsAnalytics.classList.remove('d-none');
        }

        // Calculate total open interest and volume
        let totalCallOI = 0;
        let totalPutOI = 0;
        let totalCallVolume = 0;
        let totalPutVolume = 0;

        data.forEach(option => {
            if (option.contract_type === 'call') {
                totalCallOI += option.open_interest;
                totalCallVolume += option.volume;
            } else if (option.contract_type === 'put') {
                totalPutOI += option.open_interest;
                totalPutVolume += option.volume;
            }
        });

        // Calculate put/call ratios
        const putCallOIRatio = totalPutOI / (totalCallOI || 1);
        const putCallVolumeRatio = totalPutVolume / (totalCallVolume || 1);

        // Calculate average implied volatility
        let totalCallIV = 0;
        let countCallIV = 0;
        let totalPutIV = 0;
        let countPutIV = 0;

        data.forEach(option => {
            if (option.implied_volatility) {
                if (option.contract_type === 'call') {
                    totalCallIV += option.implied_volatility;
                    countCallIV++;
                } else if (option.contract_type === 'put') {
                    totalPutIV += option.implied_volatility;
                    countPutIV++;
                }
            }
        });

        const avgCallIV = countCallIV ? totalCallIV / countCallIV : 0;
        const avgPutIV = countPutIV ? totalPutIV / countPutIV : 0;
        const avgIV = (countCallIV + countPutIV) ? (totalCallIV + totalPutIV) / (countCallIV + countPutIV) : 0;

        // Calculate volatility skew (difference between put and call IV)
        const volSkew = avgPutIV - avgCallIV;

        // Count unique expiration dates
        const expirationDates = new Set();
        data.forEach(option => expirationDates.add(option.expiration_date));

        // Update analytics display - safely handling potential null elements
        this.updateElementText('total-call-oi', formatNumber(totalCallOI));
        this.updateElementText('total-put-oi', formatNumber(totalPutOI));
        this.updateElementText('put-call-oi-ratio', putCallOIRatio.toFixed(2));
        this.updateElementText('total-call-volume', formatNumber(totalCallVolume));
        this.updateElementText('total-put-volume', formatNumber(totalPutVolume));
        this.updateElementText('put-call-volume-ratio', putCallVolumeRatio.toFixed(2));
        this.updateElementText('avg-call-iv', (avgCallIV * 100).toFixed(2) + '%');
        this.updateElementText('avg-put-iv', (avgPutIV * 100).toFixed(2) + '%');
        this.updateElementText('volatility-skew', (volSkew * 100).toFixed(2) + '%');
        this.updateElementText('expiration-count', expirationDates.size);

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
        const putCallRatio = putCallVolumeRatio;
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

        // Initialize charts if needed
        this.initializeChartsIfNeeded();

        // Update charts in the advanced section
        this.updateVolatilitySkewChart();
        this.updatePutCallRatioChart();
        this.updateOptionsVolumeChart();
    },

    /**
     * Helper method to safely update element text content
     * @param {string} elementId - ID of element to update
     * @param {string} text - Text to set
     */
    updateElementText: function(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    },

    /**
     * Update the implied move analysis based on ATM options
     */
    updateImpliedMoveAnalysis: function() {
        if (!this.optionsView.currentOptionsData || !this.optionsView.stockData) {
            return;
        }

        // Get current stock price
        const currentPrice = this.optionsView.stockData[this.optionsView.stockData.length - 1].close;

        // Get the active expiration date tab
        const activeTab = document.querySelector('#options-tabs .nav-link.active');
        if (!activeTab) return;

        const expDate = activeTab.textContent;
        if (expDate === 'All Expirations') return;

        // Filter options for the selected expiration
        const expirationOptions = this.optionsView.currentOptionsData.filter(opt =>
            this.optionsView.formatDate(opt.expiration_date) === expDate
        );

        // Find ATM call and put
        const atmStrike = this.optionsView.findClosestStrike(currentPrice, expirationOptions);
        const atmCall = expirationOptions.find(opt =>
            opt.contract_type === 'call' && opt.strike_price === atmStrike
        );
        const atmPut = expirationOptions.find(opt =>
            opt.contract_type === 'put' && opt.strike_price === atmStrike
        );

        // Calculate days to expiration
        const today = new Date();
        const expiryDate = new Date(atmCall?.expiration_date || atmPut?.expiration_date);
        const daysToExpiry = Math.max(1, Math.round((expiryDate - today) / (1000 * 60 * 60 * 24)));

        // Calculate implied move using straddle price
        let impliedMove = 0;
        let straddle = 0;

        if (atmCall && atmPut) {
            // Straddle price = ATM Call Price + ATM Put Price
            straddle = atmCall.last_price + atmPut.last_price;

            // Implied move = Straddle Price / Current Stock Price
            impliedMove = straddle / currentPrice;
        }

        // Update display
        this.updateElementText('implied-move', (impliedMove * 100).toFixed(2) + '%');

        const lowRange = currentPrice * (1 - impliedMove);
        const highRange = currentPrice * (1 + impliedMove);
        this.updateElementText('expected-range', `${formatCurrency(lowRange)} - ${formatCurrency(highRange)}`);
        this.updateElementText('days-to-expiry', daysToExpiry);
        this.updateElementText('straddle-price', formatCurrency(straddle));

        const moveContainer = document.getElementById('implied-move-container');
        if (moveContainer) {
            moveContainer.classList.remove('d-none');
        }
    },

    /**
     * Update volatility skew chart
     */
    updateVolatilitySkewChart: function() {
        if (!this.volatilitySkewChart || !this.optionsView.currentOptionsData) return;

        // Get the active expiration date tab
        const activeTab = document.querySelector('#options-tabs .nav-link.active');
        if (!activeTab) return;

        const expDate = activeTab.textContent;
        if (expDate === 'All Expirations') return;

        // Filter options for the selected expiration
        const expirationOptions = this.optionsView.currentOptionsData.filter(opt =>
            this.optionsView.formatDate(opt.expiration_date) === expDate && opt.implied_volatility
        );

        // Prepare data for calls and puts
        const callData = [];
        const putData = [];

        expirationOptions.forEach(option => {
            if (option.contract_type === 'call') {
                callData.push({
                    x: option.strike_price,
                    y: option.implied_volatility
                });
            } else if (option.contract_type === 'put') {
                putData.push({
                    x: option.strike_price,
                    y: option.implied_volatility
                });
            }
        });

        // Sort data by strike price
        callData.sort((a, b) => a.x - b.x);
        putData.sort((a, b) => a.x - b.x);

        // Update chart data
        this.volatilitySkewChart.data.datasets[0].data = callData;
        this.volatilitySkewChart.data.datasets[1].data = putData;

        // Update chart title
        this.volatilitySkewChart.options.plugins.title.text = `Volatility Skew (${expDate})`;

        // Update chart
        this.volatilitySkewChart.update();
    },

    /**
     * Update put/call ratio chart
     */
    updatePutCallRatioChart: function() {
        if (!this.putCallRatioChart || !this.optionsView.currentOptionsData) return;

        // Group options by expiration date
        const expirationMap = new Map();

        this.optionsView.currentOptionsData.forEach(option => {
            const expDate = this.optionsView.formatDate(option.expiration_date);
            if (!expirationMap.has(expDate)) {
                expirationMap.set(expDate, { calls: 0, puts: 0 });
            }

            const data = expirationMap.get(expDate);
            if (option.contract_type === 'call') {
                data.calls += option.volume;
            } else if (option.contract_type === 'put') {
                data.puts += option.volume;
            }
        });

        // Calculate put/call ratio for each expiration
        const labels = [];
        const ratios = [];

        expirationMap.forEach((data, expDate) => {
            labels.push(expDate);
            ratios.push(data.calls > 0 ? data.puts / data.calls : 0);
        });

        // Update chart data
        this.putCallRatioChart.data.labels = labels;
        this.putCallRatioChart.data.datasets[0].data = ratios;

        // Update chart
        this.putCallRatioChart.update();
    },

    /**
     * Update options volume chart
     */
    updateOptionsVolumeChart: function() {
        if (!this.optionVolumeChart || !this.optionsView.currentOptionsData) return;

        // Get the active expiration date tab
        const activeTab = document.querySelector('#options-tabs .nav-link.active');
        if (!activeTab) return;

        const expDate = activeTab.textContent;
        if (expDate === 'All Expirations') return;

        // Filter options for the selected expiration
        const expirationOptions = this.optionsView.currentOptionsData.filter(opt =>
            this.optionsView.formatDate(opt.expiration_date) === expDate
        );

        // Group by strike price
        const strikeMap = new Map();

        expirationOptions.forEach(option => {
            const strike = option.strike_price;
            if (!strikeMap.has(strike)) {
                strikeMap.set(strike, { calls: 0, puts: 0 });
            }

            const data = strikeMap.get(strike);
            if (option.contract_type === 'call') {
                data.calls += option.volume;
            } else if (option.contract_type === 'put') {
                data.puts += option.volume;
            }
        });

        // Convert to arrays for the chart
        const strikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);
        const callVolumes = strikes.map(strike => strikeMap.get(strike).calls);
        const putVolumes = strikes.map(strike => strikeMap.get(strike).puts);

        // Update chart data
        this.optionVolumeChart.data.labels = strikes;
        this.optionVolumeChart.data.datasets[0].data = callVolumes;
        this.optionVolumeChart.data.datasets[1].data = putVolumes;

        // Update chart title
        this.optionVolumeChart.options.plugins.title.text = `Option Volume by Strike (${expDate})`;

        // Update chart
        this.optionVolumeChart.update();
    },

    /**
     * Update all charts at once
     */
    updateAllCharts: function() {
        if (this.optionsView.currentOptionsData) {
            this.updateVolatilitySkewChart();
            this.updatePutCallRatioChart();
            this.updateOptionsVolumeChart();
        }
    }
};

export default OptionsAnalytics;