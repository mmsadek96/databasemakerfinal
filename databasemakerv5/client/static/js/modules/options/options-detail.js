/**
 * Options Detail Module
 * Responsible for displaying detailed information about individual option contracts
 */
class OptionsDetailModule {
    /**
     * Constructor
     * @param {Object} optionsView - Reference to the main options view
     */
    constructor(optionsView) {
        this.optionsView = optionsView;
        this.currentOption = null;
    }

    /**
     * Initialize the options detail module
     */
    initialize() {
        console.log("Options Detail Module initialized");
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Modal event listeners will be added when the modal is shown
        document.addEventListener('hidden.bs.modal', (event) => {
            if (event.target.id === 'optionDetailsModal') {
                this.resetModal();
            }
        });
    }

    /**
     * Show detailed information about an option contract
     * @param {Object} option - Option data
     */
    showOptionDetails(option) {
        console.log("Showing option details:", option);
        this.currentOption = option;

        // Calculate additional metrics
        const spread = option.ask - option.bid;
        const spreadPct = option.bid > 0 ? (spread / option.bid) * 100 : 0;

        // Get template or create new modal
        let modalElement = document.getElementById('optionDetailsModal');

        if (!modalElement) {
            // Use template if available
            const modalTemplate = document.getElementById('option-details-modal-template');
            if (modalTemplate) {
                document.body.appendChild(modalTemplate.content.cloneNode(true));
                modalElement = document.getElementById('optionDetailsModal');
                console.log("Created modal from template");
            } else {
                console.error("Option details modal template not found!");
                this.createModalProgrammatically();
                modalElement = document.getElementById('optionDetailsModal');
            }
        }

        // Set the modal title
        const modalTitle = modalElement.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = `${option.contract_name || option.contract_type.toUpperCase() + ' ' + option.strike_price}`;
        }

        // Populate modal data
        this.updateElementText(modalElement, 'modal-symbol', this.optionsView.currentSymbol);
        this.updateElementText(modalElement, 'modal-contract-type', option.contract_type.toUpperCase());
        this.updateElementText(modalElement, 'modal-strike', this.formatCurrency(option.strike_price));
        this.updateElementText(modalElement, 'modal-expiration', this.optionsView.formatDate(option.expiration_date));
        this.updateElementText(modalElement, 'modal-last-price', this.formatCurrency(option.last_price));
        this.updateElementText(modalElement, 'modal-bid', this.formatCurrency(option.bid));
        this.updateElementText(modalElement, 'modal-ask', this.formatCurrency(option.ask));
        this.updateElementText(modalElement, 'modal-spread', this.formatCurrency(spread) + ` (${spreadPct.toFixed(1)}%)`);
        this.updateElementText(modalElement, 'modal-contract-value', this.formatCurrency(option.last_price * 100));
        this.updateElementText(modalElement, 'modal-volume', this.formatNumber(option.volume));
        this.updateElementText(modalElement, 'modal-open-interest', this.formatNumber(option.open_interest));

        const volumeOIRatio = option.open_interest > 0 ?
            (option.volume / option.open_interest).toFixed(2) : 'N/A';
        this.updateElementText(modalElement, 'modal-volume-oi-ratio', volumeOIRatio);

        // Greeks
        this.updateElementText(modalElement, 'modal-iv', option.implied_volatility ?
            (option.implied_volatility * 100).toFixed(2) + '%' : 'N/A');
        this.updateElementText(modalElement, 'modal-delta', option.delta ?
            option.delta.toFixed(4) : 'N/A');
        this.updateElementText(modalElement, 'modal-gamma', option.gamma ?
            option.gamma.toFixed(4) : 'N/A');
        this.updateElementText(modalElement, 'modal-theta', option.theta ?
            option.theta.toFixed(4) : 'N/A');
        this.updateElementText(modalElement, 'modal-vega', option.vega ?
            option.vega.toFixed(4) : 'N/A');

        // Initialize the modal
        this.showModal(modalElement);
    }

    /**
     * Show the modal and set up action buttons
     * @param {HTMLElement} modalElement - The modal element
     */
    showModal(modalElement) {
        // Initialize the modal if bootstrap is available
        if (window.bootstrap && bootstrap.Modal) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            // Fallback if bootstrap is not available
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
        }

        // Add event listeners for action buttons
        this.setupModalActions(modalElement);
    }

    /**
     * Set up action buttons in the modal
     * @param {HTMLElement} modalElement - The modal element
     */
    setupModalActions(modalElement) {
        const analyzeBtn = modalElement.querySelector('#option-analyze-btn');
        if (analyzeBtn) {
            // Clear previous event listeners
            const newAnalyzeBtn = analyzeBtn.cloneNode(true);
            analyzeBtn.parentNode.replaceChild(newAnalyzeBtn, analyzeBtn);

            newAnalyzeBtn.addEventListener('click', () => {
                console.log("Analyze button clicked");
                if (this.optionsView.strategiesModule) {
                    this.optionsView.strategiesModule.analyzeOptionProfitLoss(this.currentOption);
                    this.hideModal(modalElement);
                } else {
                    console.error("Options strategies module not initialized");
                }
            });
        }

        const addStrategyBtn = modalElement.querySelector('#option-add-strategy-btn');
        if (addStrategyBtn) {
            // Clear previous event listeners
            const newAddStrategyBtn = addStrategyBtn.cloneNode(true);
            addStrategyBtn.parentNode.replaceChild(newAddStrategyBtn, addStrategyBtn);

            newAddStrategyBtn.addEventListener('click', () => {
                console.log("Add to strategy button clicked");
                if (this.optionsView.strategiesModule) {
                    this.optionsView.strategiesModule.addToCustomStrategy(this.currentOption);
                    this.hideModal(modalElement);
                } else {
                    console.error("Options strategies module not initialized");
                }
            });
        }

        // Add close button handler
        const closeBtn = modalElement.querySelector('.modal-footer .btn-secondary');
        if (closeBtn) {
            // Clear previous event listeners
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

            newCloseBtn.addEventListener('click', () => {
                this.hideModal(modalElement);
            });
        }
    }

    /**
     * Hide the modal
     * @param {HTMLElement} modalElement - The modal element
     */
    hideModal(modalElement) {
        if (window.bootstrap && bootstrap.Modal) {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        } else {
            // Fallback if bootstrap is not available
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
        }
    }

    /**
     * Reset the modal when it's hidden
     */
    resetModal() {
        this.currentOption = null;
    }

    /**
     * Update element text content
     * @param {HTMLElement} container - Container element
     * @param {string} id - Element ID
     * @param {string} text - Text to update
     */
    updateElementText(container, id, text) {
        const element = container.querySelector(`#${id}`);
        if (element) {
            element.textContent = text;
        } else {
            console.warn(`Element with ID '${id}' not found in modal`);
        }
    }

    /**
     * Create modal element programmatically if template is not available
     */
    createModalProgrammatically() {
        console.log("Creating option details modal programmatically");

        // Create modal structure
        const modal = document.createElement('div');
        modal.id = 'optionDetailsModal';
        modal.className = 'modal fade';
        modal.tabIndex = '-1';
        modal.setAttribute('aria-hidden', 'true');

        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-dark text-white">
                        <h5 class="modal-title" id="optionDetailsModalLabel">Option Contract Details</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card border-primary mb-3">
                                    <div class="card-header bg-primary text-white">Contract Details</div>
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Symbol:</span>
                                            <span class="fw-bold" id="modal-symbol"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Contract Type:</span>
                                            <span class="fw-bold" id="modal-contract-type"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Strike Price:</span>
                                            <span class="fw-bold" id="modal-strike"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Expiration Date:</span>
                                            <span class="fw-bold" id="modal-expiration"></span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span>Contract Size:</span>
                                            <span class="fw-bold">100 shares</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card border-success mb-3">
                                    <div class="card-header bg-success text-white">Pricing</div>
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Last Price:</span>
                                            <span class="fw-bold" id="modal-last-price"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Bid Price:</span>
                                            <span class="fw-bold" id="modal-bid"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Ask Price:</span>
                                            <span class="fw-bold" id="modal-ask"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Bid-Ask Spread:</span>
                                            <span class="fw-bold" id="modal-spread"></span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span>Contract Value:</span>
                                            <span class="fw-bold" id="modal-contract-value"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card border-info mb-3">
                                    <div class="card-header bg-info text-white">Volume & Open Interest</div>
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Volume:</span>
                                            <span class="fw-bold" id="modal-volume"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Open Interest:</span>
                                            <span class="fw-bold" id="modal-open-interest"></span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span>Volume / OI Ratio:</span>
                                            <span class="fw-bold" id="modal-volume-oi-ratio"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card border-warning mb-3">
                                    <div class="card-header bg-warning text-dark">Greeks</div>
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Implied Volatility:</span>
                                            <span class="fw-bold" id="modal-iv"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Delta:</span>
                                            <span class="fw-bold" id="modal-delta"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Gamma:</span>
                                            <span class="fw-bold" id="modal-gamma"></span>
                                        </div>
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Theta:</span>
                                            <span class="fw-bold" id="modal-theta"></span>
                                        </div>
                                        <div class="d-flex justify-content-between">
                                            <span>Vega:</span>
                                            <span class="fw-bold" id="modal-vega"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary me-2" id="option-analyze-btn">
                            <i class="bi bi-graph-up"></i> Analyze Profit/Loss
                        </button>
                        <button class="btn btn-success me-2" id="option-add-strategy-btn">
                            <i class="bi bi-plus-circle"></i> Add to Strategy
                        </button>
                        <button class="btn btn-secondary" data-bs-dismiss="modal">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Format currency value
     * @param {number} value - Value to format
     * @returns {string} - Formatted currency string
     */
    formatCurrency(value) {
        if (value === undefined || value === null) return 'N/A';
        return '$' + parseFloat(value).toFixed(2);
    }

    /**
     * Format number with commas
     * @param {number} value - Value to format
     * @returns {string} - Formatted string
     */
    formatNumber(value) {
            if (value === undefined || value === null) return 'N/A';
            return new Intl.NumberFormat().format(value);
        }
    }

    export { OptionsDetailModule };
