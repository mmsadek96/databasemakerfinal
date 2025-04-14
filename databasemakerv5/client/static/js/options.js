/**
 * Options Data Main Entry Point
 *
 * This file initializes the options data system and
 * connects all the components together.
 */

// Import our modules
import optionsDataManager from './modules/options/optionsDataManager.js';
import optionsUIController from './modules/options/OptionsUIController.js';
import optionsStrategyBuilder from './modules/options/OptionsStrategyBuilder.js';

// Initialize the options data system
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Options Data System...');

    // Initialize UI controller
    optionsUIController.initialize();

    // Initialize strategy builder
    optionsStrategyBuilder.initialize();

    // Add global error handling for the options system
    window.addEventListener('error', function(event) {
        if (event.error && event.error.message) {
            // Only handle errors related to our options system
            if (event.filename && (
                event.filename.includes('options') ||
                event.error.stack && event.error.stack.includes('options')
            )) {
                console.error('Options System Error:', event.error);

                // Show error in UI if available
                try {
                    const errorElement = document.getElementById('options-error');
                    const errorMessageElement = document.getElementById('options-error-message');

                    if (errorElement && errorMessageElement) {
                        errorElement.classList.remove('d-none');
                        errorMessageElement.textContent = `An error occurred: ${event.error.message}`;
                    }
                } catch (e) {
                    // Ignore errors in error handling
                }
            }
        }
    });

    // Provide access to the options system globally for debugging
    window.optionsSystem = {
        dataManager: optionsDataManager,
        uiController: optionsUIController,
        strategyBuilder: optionsStrategyBuilder
    };

    console.log('Options Data System initialized successfully');
});

// Export the modules for importing elsewhere
export { optionsDataManager, optionsUIController, optionsStrategyBuilder };