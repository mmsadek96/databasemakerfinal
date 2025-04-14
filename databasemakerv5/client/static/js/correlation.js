/**
 * Correlation analysis view controller
 * @module correlation
 */

import API from './api.js';
import App from './app.js';

/**
 * Correlation analysis view controller
 */
const CorrelationView = {
    /**
     * Set of selected correlation stocks
     */
    selectedStocks: new Set(),

    /**
     * Set of selected correlation indicators
     */
    selectedIndicators: new Set(),

    /**
     * Initialize the correlation view
     */
    initialize: function() {
        // Set up event listeners
        this.setupEventListeners();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Add stock to correlation analysis
        document.getElementById('add-correlation-stock').addEventListener('click', () => {
            const symbol = document.getElementById('correlation-stock-input').value.trim().toUpperCase();
            if (symbol && !this.selectedStocks.has(symbol)) {
                this.selectedStocks.add(symbol);
                this.updateSelectionList();
                document.getElementById('correlation-stock-input').value = '';
            }
        });

        // Add indicator to correlation analysis
        document.getElementById('add-correlation-indicator').addEventListener('click', () => {
            const indicator = document.getElementById('correlation-indicator-select').value;
            if (indicator && !this.selectedIndicators.has(indicator)) {
                this.selectedIndicators.add(indicator);
                this.updateSelectionList();
            }
        });

        // Calculate correlation button
        document.getElementById('calculate-correlation-button').addEventListener('click', () => {
            if ((this.selectedStocks.size + this.selectedIndicators.size) < 2) {
                App.showNotification('Please select at least two data series for correlation analysis.', 'warning');
                return;
            }

            this.calculateCorrelation();
        });
    },

    /**
     * Update the correlation selection lists
     */
    updateSelectionList: function() {
        // Update stocks list
        const stocksList = document.getElementById('correlation-stocks-list');
        stocksList.innerHTML = '';

        this.selectedStocks.forEach(symbol => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            item.innerHTML = `
                ${symbol}
                <button class="btn btn-sm btn-outline-danger remove-correlation-item" data-type="stock" data-value="${symbol}">
                    <i class="bi bi-x"></i>
                </button>
            `;
            stocksList.appendChild(item);
        });

        // Update indicators list
        const indicatorsList = document.getElementById('correlation-indicators-list');
        indicatorsList.innerHTML = '';

        this.selectedIndicators.forEach(indicator => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            item.innerHTML = `
                ${indicator}
                <button class="btn btn-sm btn-outline-danger remove-correlation-item" data-type="indicator" data-value="${indicator}">
                    <i class="bi bi-x"></i>
                </button>
            `;
            indicatorsList.appendChild(item);
        });

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-correlation-item').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const type = button.getAttribute('data-type');
                const value = button.getAttribute('data-value');

                if (type === 'stock') {
                    this.selectedStocks.delete(value);
                } else if (type === 'indicator') {
                    this.selectedIndicators.delete(value);
                }

                this.updateSelectionList();
            });
        });
    },

    /**
     * Calculate correlation between selected data series
     */
    calculateCorrelation: function() {
        const startDate = document.getElementById('correlation-start-date').value;
        const endDate = document.getElementById('correlation-end-date').value;

        const stocks = Array.from(this.selectedStocks);
        const indicators = Array.from(this.selectedIndicators);

        // Show loading state
        document.getElementById('correlation-matrix').innerHTML =
            '<p class="text-center"><i class="bi bi-hourglass-split"></i> Calculating correlation...</p>';

        API.getCorrelation(stocks, indicators, startDate, endDate)
            .then(data => {
                // Render correlation matrix
                this.renderCorrelationMatrix(data);
            })
            .catch(error => {
                console.error('Error calculating correlation:', error);
                document.getElementById('correlation-matrix').innerHTML =
                    `<div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${error.message}
                    </div>`;
            });
    },

    /**
     * Render correlation matrix heatmap
     * @param {Object} data - Correlation data
     */
    renderCorrelationMatrix: function(data) {
        const matrixElement = document.getElementById('correlation-matrix');

        // Create table for correlation matrix
        const table = document.createElement('table');
        table.className = 'table table-bordered correlation-table';

        // Create header row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Empty first cell
        headerRow.appendChild(document.createElement('th'));

        // Add column headers
        data.labels.forEach(label => {
            const th = document.createElement('th');
            th.textContent = label;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        // Add data rows
        data.labels.forEach((label, rowIndex) => {
            const row = document.createElement('tr');

            // Row header
            const th = document.createElement('th');
            th.textContent = label;
            row.appendChild(th);

            // Add cells with correlation values
            data.matrix[rowIndex].forEach((value, colIndex) => {
                const td = document.createElement('td');
                td.textContent = value.toFixed(2);

                // Color coding for correlation strength
                if (rowIndex !== colIndex) { // Skip self-correlation (diagonal)
                    const absValue = Math.abs(value);
                    if (absValue >= 0.7) {
                        td.className = value > 0 ? 'bg-success text-white' : 'bg-danger text-white';
                    } else if (absValue >= 0.4) {
                        td.className = value > 0 ? 'bg-success-light' : 'bg-danger-light';
                    } else if (absValue >= 0.2) {
                        td.className = value > 0 ? 'bg-success-lighter' : 'bg-danger-lighter';
                    }
                } else {
                    td.className = 'table-secondary'; // Diagonal cells
                }

                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        // Clear and add the table to the matrix element
        matrixElement.innerHTML = '';
        matrixElement.appendChild(table);

        // Add legend
        const legend = document.createElement('div');
        legend.className = 'correlation-legend mt-3';
        legend.innerHTML = `
            <div class="d-flex justify-content-center">
                <div class="mx-2"><span class="badge bg-danger">≤ -0.7</span> Strong negative</div>
                <div class="mx-2"><span class="badge bg-danger-light">-0.4 to -0.7</span> Moderate negative</div>
                <div class="mx-2"><span class="badge bg-danger-lighter">-0.2 to -0.4</span> Weak negative</div>
                <div class="mx-2"><span class="badge bg-light text-dark">-0.2 to 0.2</span> Little or no correlation</div>
                <div class="mx-2"><span class="badge bg-success-lighter">0.2 to 0.4</span> Weak positive</div>
                <div class="mx-2"><span class="badge bg-success-light">0.4 to 0.7</span> Moderate positive</div>
                <div class="mx-2"><span class="badge bg-success">≥ 0.7</span> Strong positive</div>
            </div>
        `;
        matrixElement.appendChild(legend);
    }
};

export default CorrelationView;