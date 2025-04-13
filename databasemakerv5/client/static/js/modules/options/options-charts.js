/**
 * Options Charts Module
 * Responsible for creating and managing charts for options analysis
 */
class OptionsChartsModule {
    /**
     * Constructor
     * @param {Object} optionsView - Reference to the main options view
     */
    constructor(optionsView) {
        this.optionsView = optionsView;

        // Chart instances
        this.volatilitySkewChart = null;
        this.putCallRatioChart = null;
        this.optionVolumeChart = null;
    }

    /**
     * Initialize the options charts module
     */
    initialize() {
        console.log("Options Charts Module initialized");
    }

    /**
     * Initialize chart instances when needed
     */
    initializeChartsIfNeeded() {
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
    }

    /**
     * Update volatility skew chart
     */
    updateVolatilitySkewChart() {
        if (!this.optionsView || !this.optionsView.currentOptionsData) {
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

        // Initialize charts if needed
        this.initializeChartsIfNeeded();

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
    }

    /**
     * Update put/call ratio chart
     */
    updatePutCallRatioChart() {
        if (!this.optionsView || !this.optionsView.currentOptionsData) {
            console.error("Cannot update put/call ratio chart - missing required data");
            return;
        }

        // Initialize charts if needed
        this.initializeChartsIfNeeded();

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
    }

    /**
     * Update options volume chart
     */
    updateOptionsVolumeChart() {
        if (!this.optionsView || !this.optionsView.currentOptionsData) {
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

        // Initialize charts if needed
        this.initializeChartsIfNeeded();

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
    }

    /**
     * Update all charts at once
     */
    updateAllCharts() {
        console.log("Updating all options charts");

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
    }
}

export { OptionsChartsModule };
