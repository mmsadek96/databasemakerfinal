/**
 * Main application controller
 * @module app
 */

import DashboardView from './dashboard.js';
import StocksView from './stocks.js';
import IndicatorsView from './indicators.js';
import CorrelationView from './correlation.js';
import OptionsView from './options.js';
import TranscriptsView from './transcripts.js';
import API from './api.js';
import { debounce } from './utils.js';

/**
 * Main application controller
 */
const App = {
    /**
     * Initialize the application
     */
    initialize: function() {
        // Set up navigation
        this.setupNavigation();

        // Initialize date inputs with default values
        this.initializeDateInputs();

        // Set up global search
        this.setupGlobalSearch();

        // Set up API key handling
        this.setupApiKeyHandling();

        // Initialize view controllers
        this.initializeViewControllers();
    },

    /**
     * Initialize all view controllers
     */
    initializeViewControllers: function() {
        DashboardView.initialize();
        StocksView.initialize();
        IndicatorsView.initialize();
        CorrelationView.initialize();
        OptionsView.initialize();
        TranscriptsView.initialize();
    },

    /**
     * Set up navigation between different views
     */
    // Add this to client/static/js/app.js or update the existing setupNavigation function:

    setupNavigation: function() {
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        const viewSections = document.querySelectorAll('.view-section');

        console.log("Setting up navigation with", navLinks.length, "links and", viewSections.length, "view sections");

        // First, hide all sections except the dashboard
        viewSections.forEach(section => {
            if (section.id === 'dashboard-view') {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Add click handlers to navigation links
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                console.log("Nav link clicked:", this.id);
                e.preventDefault();

                // Remove active class from all nav links and add to clicked link
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                // Show the corresponding view and hide others
                const targetView = this.id.replace('nav-', '') + '-view';
                console.log("Target view:", targetView);

                viewSections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === targetView) {
                        section.classList.add('active');
                    }
                });
            });
        });
    },

    /**
     * Initialize date inputs with default values
     */
    initializeDateInputs: function() {
        // Get current date
        const today = new Date();

        // Create date formatters
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        // Set default dates for all date inputs (default to 1 year)
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (input.id.includes('end-date')) {
                // Set end date to yesterday to ensure all data exists
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                input.value = formatDate(yesterday);
            } else if (input.id.includes('start-date')) {
                // Default to 1 year ago from yesterday
                const startDate = new Date(today);
                startDate.setFullYear(startDate.getFullYear() - 1);
                input.value = formatDate(startDate);
            }
        });
    },

    /**
     * Set up global search functionality
     */
    setupGlobalSearch: function() {
        const searchInput = document.getElementById('symbol-search');
        const searchButton = document.getElementById('search-button');

        // Search on button click
        searchButton.addEventListener('click', this.performGlobalSearch.bind(this));

        // Search on Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performGlobalSearch();
            }
        });

        // Setup debounced search for auto-suggestions (future feature)
        searchInput.addEventListener('input', debounce(this.autoSuggestSearch.bind(this), 300));
    },

    /**
     * Perform global search
     */
    performGlobalSearch: function() {
        const keywords = document.getElementById('symbol-search').value.trim();
        if (!keywords) return;

        // Show loading state in the search results table
        document.getElementById('search-results-table').querySelector('tbody').innerHTML =
            '<tr><td colspan="5" class="text-center">Searching...</td></tr>';

        // Show the modal
        const searchModal = new bootstrap.Modal(document.getElementById('searchResultsModal'));
        searchModal.show();

        // Fetch results
        API.searchSymbols(keywords)
            .then(data => {
                this.displaySearchResults(data);
            })
            .catch(error => {
                console.error('Error searching symbols:', error);
                document.getElementById('search-results-table').querySelector('tbody').innerHTML =
                    `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
            });
    },

    /**
     * Auto-suggest search (placeholder for future feature)
     */
    autoSuggestSearch: function() {
        // This would be implemented with a dropdown of suggestions
        // For now, it's just a placeholder
    },

    /**
     * Display search results in the modal
     * @param {Array} results - Search results
     */
    displaySearchResults: function(results) {
        const tbody = document.getElementById('search-results-table').querySelector('tbody');

        if (!results || results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No results found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        results.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result['1. symbol']}</td>
                <td>${result['2. name']}</td>
                <td>${result['3. type']}</td>
                <td>${result['4. region']}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-primary view-stock" data-symbol="${result['1. symbol']}">
                            <i class="bi bi-graph-up"></i> View
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-primary view-options" data-symbol="${result['1. symbol']}">
                            <i class="bi bi-grid-3x3"></i> Options
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners for action buttons
        this.setupSearchResultActions();
    },

    /**
     * Set up action buttons in search
     /**
     * Set up action buttons in search results
     */
    setupSearchResultActions: function() {
        const tbody = document.getElementById('search-results-table').querySelector('tbody');

        // View stock action
        tbody.querySelectorAll('.view-stock').forEach(button => {
            button.addEventListener('click', function() {
                const symbol = this.getAttribute('data-symbol');

                // Close the modal
                bootstrap.Modal.getInstance(document.getElementById('searchResultsModal')).hide();

                // Navigate to stocks view and load the selected stock
                document.getElementById('nav-stocks').click();
                document.getElementById('stock-symbol-input').value = symbol;
                document.getElementById('stock-search-button').click();
            });
        });

        // View options action
        tbody.querySelectorAll('.view-options').forEach(button => {
            button.addEventListener('click', function() {
                const symbol = this.getAttribute('data-symbol');

                // Close the modal
                bootstrap.Modal.getInstance(document.getElementById('searchResultsModal')).hide();

                // Navigate to options view and load the selected stock's options
                document.getElementById('nav-options').click();
                document.getElementById('options-symbol').value = symbol;
                document.getElementById('load-options-button').click();
            });
        });
    },

    /**
     * Set up API key handling
     */
    setupApiKeyHandling: function() {
        // Load current API key
        API.getApiKey()
            .then(data => {
                document.getElementById('api-key-input').value = data.apikey;
            })
            .catch(error => {
                console.error('Error loading API key:', error);
            });

        // Save API key
        document.getElementById('save-api-key').addEventListener('click', function() {
            const apiKey = document.getElementById('api-key-input').value.trim();

            if (!apiKey) {
                alert('Please enter an API key');
                return;
            }

            API.updateApiKey(apiKey)
                .then(data => {
                    alert('API key updated successfully');
                    bootstrap.Modal.getInstance(document.getElementById('apiKeyModal')).hide();

                    // Reload the dashboard data with the new API key
                    DashboardView.loadDashboardData();
                })
                .catch(error => {
                    console.error('Error updating API key:', error);
                    alert('Error updating API key: ' + error.message);
                });
        });
    },

    /**
     * Show a notification to the user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    showNotification: function(message, type = 'info', duration = 3000) {
        // Create notification element if it doesn't exist
        let notificationContainer = document.getElementById('notification-container');

        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bi ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">×</button>
        `;

        // Add to container
        notificationContainer.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            notification.classList.add('notification-hiding');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.add('notification-hiding');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
    },

    /**
     * Get icon for notification type
     * @param {string} type - Notification type
     * @returns {string} - Icon class
     */
    getNotificationIcon: function(type) {
        switch (type) {
            case 'success': return 'bi-check-circle';
            case 'error': return 'bi-exclamation-circle';
            case 'warning': return 'bi-exclamation-triangle';
            default: return 'bi-info-circle';
        }
    }
};

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.initialize());

export default App;