/**
 * Options analytics functions
 * @module options-analytics
 */

// This is an updated version of options-analytics.js with fixed DOM element handling

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
        console.log("OptionsAnalytics initialized with optionsView:", optionsView ? "provided" : "missing");
    },

    /**
     * Initialize chart instances when needed
     */
    initializeChartsIfNeeded: function() {
        console.log("Initializing options analytics charts if needed");

        // Volatility Skew Chart
        if (!this.volatilitySkewChart) {
            const skewCtx = document.getElementById('volatility-skew-chart');
            if (skewCtx) {
                console.log("Creating volatility skew chart");
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
            } else {
                console.error("Volatility skew chart canvas element not found");
            }
        }

        // Put/Call Ratio Chart
        if (!this.putCallRatioChart) {
            const ratioCtx = document.getElementById('put-call-ratio-chart');
            if (ratioCtx) {
                console.log("Creating put/call ratio chart");
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
            } else {
                console.error("Put/call ratio chart canvas element not found");
            }
        }

        // Option Volume Chart
        if (!this.optionVolumeChart) {
            const volumeCtx = document.getElementById('option-volume-chart');
            if (volumeCtx) {
                console.log("Creating option volume chart");
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
            } else {
                console.error("Option volume chart canvas element not found");
            }
        }
    },

    /**
     * Update options analytics with advanced institutional metrics
     * @param {Array} data - Options data
     * @param {string} symbol - Stock symbol
     */
    updateOptionsAnalytics: function(data, symbol) {
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

        // Initialize charts if needed
        this.initializeChartsIfNeeded();

        // Update charts in the advanced section
        this.updateVolatilitySkewChart();
        this.updatePutCallRatioChart();
        this.updateOptionsVolumeChart();

        // Update implied move calculation
        this.updateImpliedMoveAnalysis();

        // Make sure to always create and initialize implied move container elements
        this.ensureImpliedMoveElements();
    },

    /**
     * Helper method to safely update element text content
     * @param {string} elementId - ID of element to update
     * @param {string} text - Text to set
     */
    safeUpdateElementText: function(elementId, text) {
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
    },

    /**
     * Format number with commas
     * @param {number} value - Value to format
     * @returns {string} - Formatted number string
     */
    formatNumber: function(value) {
        if (value === undefined || value === null) return 'N/A';

        // Format with commas
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    /**
     * Ensure that all required DOM elements for implied move analysis exist
     */
    ensureImpliedMoveElements: function() {
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
    },

    /**
     * Update the implied move analysis based on ATM options
     */
    /**
    * Update the implied move analysis based on ATM options
    */
    updateImpliedMoveAnalysis: function() {
        console.log("Updating implied move analysis");

        // Make sure we have options data and stock data
        if (!this.optionsView || !this.optionsView.stockData) {
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
    },

    /**
     * Update volatility skew chart
     */
    updateVolatilitySkewChart: function() {
        if (!this.volatilitySkewChart || !this.optionsView || !this.optionsView.currentOptionsData) {
            console.error("Cannot update volatility skew chart - missing required data");
            return;
        }

        // Get the active expiration date tab
        const activeTab = document.querySelector('#options-tabs .nav-link.active');
        if (!activeTab) {
            console.warn("Cannot update volatility skew chart - no active tab");
            return;
        }

        const expDate = activeTab.textContent.trim();
        if (expDate === 'All Expirations') {
            console.warn("All Expirations tab is active, cannot update volatility skew chart");
            return;
        }

        // Filter options for the selected expiration
        const expirationOptions = this.optionsView.currentOptionsData.filter(opt =>
            this.optionsView.formatDate(opt.expiration_date) === expDate &&
            opt.implied_volatility !== undefined &&
            opt.implied_volatility !== null &&
            !isNaN(parseFloat(opt.implied_volatility))
        );

        console.log(`Found ${expirationOptions.length} options with IV data for ${expDate}`);

        if (expirationOptions.length === 0) {
            console.warn("No options with IV data for selected expiration");
            return;
        }

        // Prepare data for calls and puts
        const callData = [];
        const putData = [];

        expirationOptions.forEach(option => {
            const iv = parseFloat(option.implied_volatility);
            const strike = parseFloat(option.strike_price);

            // Validate the data before adding to chart
            if (!isNaN(iv) && !isNaN(strike)) {
                const dataPoint = {
                    x: strike,
                    y: iv
                };

                if (option.contract_type === 'call') {
                    callData.push(dataPoint);
                } else if (option.contract_type === 'put') {
                    putData.push(dataPoint);
                }
            }
        });

        // Sort data by strike price
        callData.sort((a, b) => a.x - b.x);
        putData.sort((a, b) => a.x - b.x);

        console.log(`Prepared ${callData.length} call and ${putData.length} put data points for IV skew chart`);

        // Update chart data
        this.volatilitySkewChart.data.datasets[0].data = callData;
        this.volatilitySkewChart.data.datasets[1].data = putData;

        // Update chart title
        this.volatilitySkewChart.options.plugins.title.text = `Volatility Skew (${expDate})`;

        // Update chart
        this.volatilitySkewChart.update();
        console.log("Volatility skew chart updated");
    },

    /**
     * Update put/call ratio chart
     */
    updatePutCallRatioChart: function() {
        if (!this.putCallRatioChart || !this.optionsView || !this.optionsView.currentOptionsData) {
            console.error("Cannot update put/call ratio chart - missing required data");
            return;
        }

        // Group options by expiration date
        const expirationMap = new Map();

        this.optionsView.currentOptionsData.forEach(option => {
            if (!option.expiration_date) return;

            const expDate = this.optionsView.formatDate(option.expiration_date);
            if (!expirationMap.has(expDate)) {
                expirationMap.set(expDate, { calls: 0, puts: 0 });
            }

            const data = expirationMap.get(expDate);
            const volume = parseInt(option.volume) || 0;

            if (option.contract_type === 'call') {
                data.calls += volume;
            } else if (option.contract_type === 'put') {
                data.puts += volume;
            }
        });

        console.log(`Found volume data for ${expirationMap.size} expiration dates`);

        if (expirationMap.size === 0) {
            console.warn("No expiration dates with volume data found");
            return;
        }

        // Calculate put/call ratio for each expiration
        const labels = [];
        const ratios = [];

        expirationMap.forEach((data, expDate) => {
            labels.push(expDate);
            // Avoid division by zero
            ratios.push(data.calls > 0 ? data.puts / data.calls : 0);
        });

        console.log(`Calculated P/C ratios for ${labels.length} expiration dates`);

        // Update chart data
        this.putCallRatioChart.data.labels = labels;
        this.putCallRatioChart.data.datasets[0].data = ratios;

        // Update chart
        this.putCallRatioChart.update();
        console.log("Put/call ratio chart updated");
    },

    /**
     * Update options volume chart
     */
    updateOptionsVolumeChart: function() {
        if (!this.optionVolumeChart || !this.optionsView || !this.optionsView.currentOptionsData) {
            console.error("Cannot update options volume chart - missing required data");
            return;
        }

        // Get the active expiration date tab
        const activeTab = document.querySelector('#options-tabs .nav-link.active');
        if (!activeTab) {
            console.warn("Cannot update options volume chart - no active tab");
            return;
        }

        const expDate = activeTab.textContent.trim();
        if (expDate === 'All Expirations') {
            console.warn("All Expirations tab is active, cannot update options volume chart");
            return;
        }

        // Filter options for the selected expiration
        const expirationOptions = this.optionsView.currentOptionsData.filter(opt =>
            this.optionsView.formatDate(opt.expiration_date) === expDate
        );

        console.log(`Found ${expirationOptions.length} options for ${expDate} to use in volume chart`);

        if (expirationOptions.length === 0) {
            console.warn("No options found for selected expiration");
            return;
        }

        // Group by strike price
        const strikeMap = new Map();

        expirationOptions.forEach(option => {
            const strike = parseFloat(option.strike_price);
            if (isNaN(strike)) return;

            if (!strikeMap.has(strike)) {
                strikeMap.set(strike, { calls: 0, puts: 0 });
            }

            const data = strikeMap.get(strike);
            const volume = parseInt(option.volume) || 0;

            if (option.contract_type === 'call') {
                data.calls += volume;
            } else if (option.contract_type === 'put') {
                data.puts += volume;
            }
        });

        console.log(`Grouped volume data for ${strikeMap.size} different strike prices`);

        // Convert to arrays for the chart
        const strikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);
        const callVolumes = strikes.map(strike => strikeMap.get(strike).calls);
        const putVolumes = strikes.map(strike => strikeMap.get(strike).puts);

        // Update chart data
        this.optionVolumeChart.data.labels = strikes.map(strike => strike.toFixed(2));
        this.optionVolumeChart.data.datasets[0].data = callVolumes;
        this.optionVolumeChart.data.datasets[1].data = putVolumes;

        // Update chart title
        this.optionVolumeChart.options.plugins.title.text = `Option Volume by Strike (${expDate})`;

        // Update chart
        this.optionVolumeChart.update();
        console.log("Options volume chart updated");
    },

    /**
     * Update all charts at once
     */
    updateAllCharts: function() {
        console.log("Updating all options analytics charts");

        if (!this.optionsView || !this.optionsView.currentOptionsData) {
            console.error("Cannot update charts - missing options data");
            return;
        }

        // Make sure charts are initialized
        this.initializeChartsIfNeeded();

        // Update each chart
        this.updateVolatilitySkewChart();
        this.updatePutCallRatioChart();
        this.updateOptionsVolumeChart();

        // Also update the implied move analysis
        this.updateImpliedMoveAnalysis();
    }
};

export default OptionsAnalytics;