/**
 * Transcript analysis view controller
 * @module transcripts
 */

import API from './api.js';
import { formatDate, getSentimentClass, formatSentimentText, extractMetricsFromText } from './utils.js';
import App from './app.js';

/**
 * Transcript analysis view controller
 */
const TranscriptsView = {
    /**
     * Initialize the transcripts view
     */
    initialize: function() {
        // Set up event listeners
        this.setupEventListeners();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Analyze transcript button
        document.getElementById('analyze-transcript-button').addEventListener('click', () => {
            const symbol = document.getElementById('transcript-symbol').value.trim().toUpperCase();
            const quarter = document.getElementById('transcript-quarter').value.trim();
            const analyzePastQuarters = document.getElementById('analyze-past-quarters').checked;
            const numQuarters = parseInt(document.getElementById('num-quarters').value) || 4;
            const includeFinancials = document.getElementById('include-financials').checked;

            if (symbol) {
                this.loadTranscriptAnalysis(symbol, quarter, analyzePastQuarters, numQuarters, includeFinancials);
            }
        });

        // Symbol input on Enter key
        document.getElementById('transcript-symbol').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('analyze-transcript-button').click();
            }
        });

        // Quarter input on Enter key
        document.getElementById('transcript-quarter').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('analyze-transcript-button').click();
            }
        });

        // Initialize the view-financials button (using event delegation)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'view-financials-button') {
                const symbol = e.target.getAttribute('data-symbol');
                if (symbol) {
                    this.fetchAndDisplayFinancials(symbol);
                }
            }
        });
    },

    /**
     * Load transcript analysis
     * @param {string} symbol - Stock symbol
     * @param {string} quarter - Quarter code
     * @param {boolean} analyzePastQuarters - Whether to analyze past quarters
     * @param {number} numQuarters - Number of quarters to analyze
     * @param {boolean} includeFinancials - Whether to include financials
     */
    loadTranscriptAnalysis: function(symbol, quarter, analyzePastQuarters, numQuarters, includeFinancials) {
        // Show loading state
        document.getElementById('transcript-loading').classList.remove('d-none');
        document.getElementById('transcript-error').classList.add('d-none');
        document.getElementById('transcript-results').classList.add('d-none');

        API.getTranscriptAnalysis(symbol, quarter, analyzePastQuarters, numQuarters, includeFinancials)
            .then(data => {
                // Hide loading
                document.getElementById('transcript-loading').classList.add('d-none');

                // Display results
                this.displayTranscriptResults(data);
            })
            .catch(error => {
                console.error('Error fetching transcript analysis:', error);

                // Hide loading and show error
                document.getElementById('transcript-loading').classList.add('d-none');
                document.getElementById('transcript-error').classList.remove('d-none');
                document.getElementById('transcript-error-message').textContent = error.message;
            });
    },

    /**
     * Display transcript analysis results
     * @param {Object} data - Transcript analysis data
     */
    displayTranscriptResults: function(data) {
        const resultsContainer = document.getElementById('transcript-results');
        resultsContainer.classList.remove('d-none');

        // Extract metrics and key points for the executive summary
        const metrics = extractMetricsFromText(data.primary_analysis);
        const keyPoints = this.extractKeyPoints(data.primary_analysis);
        const keyStatements = this.extractKeyStatements(data.transcript);
        const keyPhrases = this.extractKeyPhrases(data.transcript);

        // Calculate overall sentiment
        const overallSentiment = this.calculateOverallSentiment(data.transcript);

        // Check if financial data is available
        const hasFinancialData = data.financial_data && Object.keys(data.financial_data).length > 0;

        // Create enhanced HTML content for the results
        let html = `
            <div class="transcript-analysis-container">
                <!-- Financial Data Badge - if available -->
                ${hasFinancialData ? `
                <div class="d-flex justify-content-end mb-3">
                    <button id="view-financials-button" class="btn btn-outline-primary" data-symbol="${data.symbol}">
                        <i class="bi bi-graph-up"></i> View Financial Data
                    </button>
                </div>
                ` : ''}
                
                <!-- Executive Summary Section -->
                <div class="exec-summary">
                    <h4>Executive Summary - ${data.symbol} ${data.quarter}</h4>
                    
                    <!-- Financial Context Badge - if used in analysis -->
                    ${data.includes_financial_context ? `
                    <div class="alert alert-info mb-3">
                        <i class="bi bi-info-circle"></i> This analysis includes comprehensive financial context including balance sheet, 
                        income statement, cash flow, and insider transaction data.
                    </div>
                    ` : ''}
                    
                    <!-- Sentiment Meter -->
                    <div class="sentiment-container">
                        <span class="sentiment-label">Overall Sentiment</span>
                        <div class="sentiment-meter">
                            <div class="sentiment-value ${getSentimentClass(overallSentiment)}" 
                                 style="width: ${Math.min(Math.abs(overallSentiment) * 100, 100)}%; ${overallSentiment < 0 ? 'margin-left: auto;' : ''}"></div>
                        </div>
                        <div class="sentiment-text">
                            <span>Negative</span>
                            <span>Neutral</span>
                            <span>Positive</span>
                        </div>
                    </div>
    
                    <!-- Metrics Grid -->
                    <div class="metrics-grid">
                        ${metrics.map(metric => `
                            <div class="metric">
                                <span class="metric-value ${this.getMetricSentimentClass(metric.value, metric.isPercentage)}">${this.formatMetricValue(metric.value, metric.isPercentage)}</span>
                                <span class="metric-label">${metric.label}</span>
                            </div>
                        `).join('')}
                    </div>
    
                    <!-- Key Takeaways -->
                    <div class="key-takeaways">
                        <h5>Key Takeaways</h5>
                        <ul class="key-takeaways-list">
                            ${keyPoints.map(point => `<li>${point}</li>`).join('')}
                        </ul>
                    </div>
                </div>
    
                <!-- Sentiment Trend Chart (if comparative data available) -->
                ${data.comparative_analysis ? this.createSentimentTrendChart(data) : ''}
    
                <!-- Main Content with Sidebar -->
                <div class="row analysis-with-sidebar">
                    <div class="col-lg-9">
                        <!-- Tabs Section -->
                        <div class="card mb-4">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h3 class="mb-0">${data.symbol} Earnings Call Analysis - ${data.quarter}</h3>
                            </div>
                            <div class="card-body p-0">
                                <ul class="nav nav-tabs" id="transcriptTabs" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="analysis-tab" data-bs-toggle="tab" data-bs-target="#analysis" 
                                                type="button" role="tab" aria-controls="analysis" aria-selected="true">Analysis</button>
                                    </li>
                                    ${data.comparative_analysis ? `
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="comparative-tab" data-bs-toggle="tab" data-bs-target="#comparative" 
                                                type="button" role="tab" aria-controls="comparative" aria-selected="false">Comparative Analysis</button>
                                    </li>
                                    ` : ''}
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="key-statements-tab" data-bs-toggle="tab" data-bs-target="#key-statements" 
                                                type="button" role="tab" aria-controls="key-statements" aria-selected="false">Key Statements</button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="transcript-tab" data-bs-toggle="tab" data-bs-target="#transcript" 
                                                type="button" role="tab" aria-controls="transcript" aria-selected="false">Full Transcript</button>
                                    </li>
                                </ul>
                                
                                <div class="tab-content p-3" id="transcriptTabContent">
                                    <!-- Analysis Tab -->
                                    <div class="tab-pane fade show active" id="analysis" role="tabpanel" aria-labelledby="analysis-tab">
                                        <div class="formatted-analysis">
                                            ${this.enhanceFormattedText(data.primary_analysis)}
                                        </div>
                                    </div>
                                    
                                    <!-- Comparative Analysis Tab (if available) -->
                                    ${data.comparative_analysis ? `
                                    <div class="tab-pane fade" id="comparative" role="tabpanel" aria-labelledby="comparative-tab">
                                        <div class="alert alert-info mb-4">
                                            <i class="bi bi-info-circle"></i> This analysis compares earnings calls from 
                                            ${data.quarter} and ${data.additional_quarters_analyzed.join(', ')}.
                                        </div>
                                        <div class="formatted-analysis">
                                            ${this.enhanceFormattedText(data.comparative_analysis)}
                                        </div>
                                    </div>
                                    ` : ''}
                                    
                                    <!-- Key Statements Tab -->
                                    <div class="tab-pane fade" id="key-statements" role="tabpanel" aria-labelledby="key-statements-tab">
                                        <h4 class="mb-3">Key Statements from Executives</h4>
                                        ${keyStatements.map(statement => `
                                            <div class="key-statement">
                                                <div class="key-statement-header">
                                                    <span class="key-statement-speaker">${statement.speaker}</span>
                                                    <span class="key-statement-title">${statement.title}</span>
                                                </div>
                                                <div class="key-statement-content">
                                                    "${statement.content}"
                                                </div>
                                            </div>
                                        `).join('')}
                                        
                                        <div class="key-phrases-container mt-4">
                                            <h4 class="key-phrases-title">Frequently Mentioned Topics</h4>
                                            <div class="key-phrases-list">
                                                ${keyPhrases.map(phrase => `
                                                    <span class="key-phrase">
                                                        ${phrase[0]}
                                                        <span class="key-phrase-count">${phrase[1]}</span>
                                                    </span>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Transcript Tab -->
                                    <div class="tab-pane fade" id="transcript" role="tabpanel" aria-labelledby="transcript-tab">
                                        ${this.renderTranscript(data.transcript)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Key Takeaways Sidebar -->
                    <div class="col-lg-3">
                        <div class="key-takeaways-sidebar">
                            <h5 class="mb-3">Key Insights</h5>
                            
                            ${this.createTakeawayItem("SENTIMENT", `Overall call sentiment is ${formatSentimentText(overallSentiment)}`)}
                            ${metrics.length > 0 ? this.createTakeawayItem("PERFORMANCE", `${metrics[0].label}: ${this.formatMetricValue(metrics[0].value, metrics[0].isPercentage)}`) : ''}
                            ${keyPoints.length > 0 ? this.createTakeawayItem("HIGHLIGHT", keyPoints[0]) : ''}
                            ${keyStatements.length > 0 ? this.createTakeawayItem("CEO QUOTE", `"${this.truncateText(keyStatements[0].content, 120)}"`) : ''}
                            ${data.comparative_analysis ? this.createTakeawayItem("TREND", this.extractTrendInsight(data.comparative_analysis)) : ''}
                            
                            <div class="mt-3 text-center">
                                <button class="btn btn-sm btn-outline-primary" id="download-report-button" data-symbol="${data.symbol}" data-quarter="${data.quarter}">
                                    <i class="bi bi-download"></i> Download Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        resultsContainer.innerHTML = html;

        // Initialize any charts after the HTML is rendered
        if (data.comparative_analysis) {
            this.initializeSentimentChart(data);
        }

        // Setup collapsible sections
        this.setupCollapsibleSections();

        // Initialize any Bootstrap components
        this.initializeBootstrapComponents();

        // Setup download report button
        document.getElementById('download-report-button').addEventListener('click', (e) => {
            const symbol = e.target.getAttribute('data-symbol') || data.symbol;
            const quarter = e.target.getAttribute('data-quarter') || data.quarter;
            this.downloadAnalysisPDF(symbol, quarter);
        });
    },

    /**
     * Create sentiment trend chart section
     * @param {Object} data - Transcript data
     * @returns {string} - HTML for trend chart
     */
    createSentimentTrendChart: function(data) {
        return `
            <div class="trend-chart-container">
                <h4 class="trend-chart-title">Sentiment Trend Across Quarters</h4>
                <canvas id="sentiment-trend-chart" height="100"></canvas>
            </div>
        `;
    },

    /**
     * Create takeaway sidebar item
     * @param {string} category - Category name
     * @param {string} content - Content text
     * @returns {string} - HTML for takeaway item
     */
    createTakeawayItem: function(category, content) {
        return `
            <div class="takeaway-item">
                <div class="takeaway-category">${category}</div>
                <div class="takeaway-content">${content}</div>
            </div>
        `;
    },

    /**
     * Fetch and display financial data
     * @param {string} symbol - Stock symbol
     */
    fetchAndDisplayFinancials: function(symbol) {
        // Show loading modal
        const modalBody = document.querySelector('#financialsModal .modal-body');
        modalBody.innerHTML = '<div class="text-center"><div class="loading"></div><p class="mt-3">Loading financial data...</p></div>';

        // Show the modal
        const financialsModal = new bootstrap.Modal(document.getElementById('financialsModal'));
        financialsModal.show();

        // Update modal title
        document.querySelector('#financialsModal .modal-title').textContent = `${symbol} Financial Data`;

        // Fetch financial data
        // In a real implementation, we would call the API here
        // For this example, we'll simulate with a timeout
        setTimeout(() => {
            // Simulate error (remove this in real implementation)
            modalBody.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> Financial data would be fetched from the API in a real implementation.
                </div>
            `;
        }, 1000);
    },

    /**
     * Initialize sentiment trend chart
     * @param {Object} data - Transcript data
     */
    initializeSentimentChart: function(data) {
        const quarters = [...data.additional_quarters_analyzed];
        quarters.unshift(data.quarter);

        // This is a simplified approach - in a real implementation, you would
        // extract actual sentiment values from each transcript
        const sentimentScores = quarters.map((_, index) => {
            return 0.5 - (index * 0.1); // Demo values, replace with real data
        });

        const ctx = document.getElementById('sentiment-trend-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: quarters,
                datasets: [{
                    label: 'Management Sentiment',
                    data: sentimentScores,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                scales: {
                    y: {
                        min: -1,
                        max: 1,
                        ticks: {
                            callback: function(value) {
                                if (value === -1) return 'Very Negative';
                                if (value === -0.5) return 'Negative';
                                if (value === 0) return 'Neutral';
                                if (value === 0.5) return 'Positive';
                                if (value === 1) return 'Very Positive';
                                return '';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const score = context.raw;
                                let sentiment = 'Neutral';
                                if (score >= 0.5) sentiment = 'Very Positive';
                                else if (score >= 0.1) sentiment = 'Positive';
                                else if (score <= -0.5) sentiment = 'Very Negative';
                                else if (score <= -0.1) sentiment = 'Negative';
                                return `Sentiment: ${sentiment} (${score.toFixed(2)})`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Calculate overall sentiment from transcript
     * @param {Object} transcript - Transcript data
     * @returns {number} - Sentiment score
     */
    calculateOverallSentiment: function(transcript) {
        if (!transcript || !transcript.transcript) return 0;

        // Filter for executive statements (CEO, CFO)
        const execStatements = transcript.transcript.filter(entry => {
            const title = (entry.title || '').toLowerCase();
            return title.includes('ceo') || title.includes('chief executive') ||
                   title.includes('cfo') || title.includes('chief financial');
        });

        // If no executive statements, use all statements
        const statementsToAnalyze = execStatements.length > 0 ? execStatements : transcript.transcript;

        // Calculate average sentiment
        const sentiments = statementsToAnalyze.map(entry => entry.sentiment || 0);
        return sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length || 0;
    },

    /**
     * Extract key statements from transcript
     * @param {Object} transcript - Transcript data
     * @returns {Array} - Key statements
     */
    extractKeyStatements: function(transcript) {
        if (!transcript || !transcript.transcript) return [];

        // Words that indicate important statements
        const significantPhrases = ['increase', 'decrease', 'guidance', 'expect',
                                  'forecast', 'growth', 'decline', 'challenge',
                                  'revenue', 'profit', 'margin', 'outlook', 'strategic'];

        // Find most significant statements
        const statements = [];
        transcript.transcript.forEach(entry => {
            // Only consider executive statements
            const title = (entry.title || '').toLowerCase();
            if (title.includes('ceo') || title.includes('chief executive') ||
                title.includes('cfo') || title.includes('chief financial')) {

                // Split content into sentences
                const sentences = entry.content.match(/[^.!?]+[.!?]+/g) || [];

                sentences.forEach(sentence => {
                    // Calculate importance score based on significant phrases
                    let score = 0;
                    significantPhrases.forEach(phrase => {
                        const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
                        const matches = sentence.match(regex) || [];
                        score += matches.length;
                    });

                    // Check for numbers/percentages which often indicate important metrics
                    const hasNumbers = /\d+%|\d+\.\d+%|\$\d+|\d+\s(million|billion)/.test(sentence);
                    if (hasNumbers) score += 2;

                    if (score >= 2) { // At least 2 significance points
                        statements.push({
                            speaker: entry.speaker,
                            title: entry.title,
                            content: sentence.trim(),
                            score: score,
                            sentiment: entry.sentiment || 0
                        });
                    }
                });
            }
        });

        // Return top statements sorted by importance score
        return statements.sort((a, b) => b.score - a.score).slice(0, 5);
    },

    /**
     * Extract key phrases from transcript
     * @param {Object} transcript - Transcript data
     * @returns {Array} - Key phrases with counts
     */
    extractKeyPhrases: function(transcript) {
        if (!transcript || !transcript.transcript) return [];

        // Common financial keywords to track
        const keyPhrases = ['revenue growth', 'margin', 'guidance', 'forecast', 'outlook',
                          'challenges', 'opportunities', 'strategic', 'acquisition',
                          'performance', 'market share', 'competition', 'product',
                          'customer', 'investment', 'technology', 'innovation'];
        const phraseCount = {};

        // Count occurrences
        transcript.transcript.forEach(entry => {
            keyPhrases.forEach(phrase => {
                const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
                const matches = entry.content.match(regex) || [];
                phraseCount[phrase] = (phraseCount[phrase] || 0) + matches.length;
            });
        });

        // Return sorted by frequency, only phrases that appear
        return Object.entries(phraseCount)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10 phrases
    },

    /**
     * Extract key points from analysis text
     * @param {string} analysis - Analysis text
     * @returns {Array} - Key points
     */
    extractKeyPoints: function(analysis) {
        if (!analysis) return [];

        // Look for bullet points, numbered lists, or sentences that start with key phrases
        const bulletPoints = analysis.match(/•\s.+?(?=\n|$)/g) || [];
        const numberedPoints = analysis.match(/\d+\.\s.+?(?=\n|$)/g) || [];

        // Key phrases that often introduce important points
        const keyPhraseIntros = [
            'key takeaway', 'importantly', 'notable', 'significantly',
            'management highlight', 'worth noting', 'note that'
        ];

        // Find sentences that start with key phrases
        const sentences = analysis.match(/[^.!?]+[.!?]+/g) || [];
        const keyPhrasePoints = sentences.filter(sentence => {
            const lowerSentence = sentence.toLowerCase().trim();
            return keyPhraseIntros.some(phrase => lowerSentence.includes(phrase));
        });

        // Combine all points and clean them up
        let allPoints = [...bulletPoints, ...numberedPoints, ...keyPhrasePoints];

        // Clean up points and remove duplicates
        allPoints = allPoints.map(point => {
            // Remove bullet markers, numbers and trim
            return point.replace(/^[•\d]+\.\s+/, '').trim();
        });

        // Remove duplicates by converting to Set and back
        allPoints = [...new Set(allPoints)];

        // If we still don't have enough points, extract sentences with important keywords
        if (allPoints.length < 3) {
            const importantKeywords = ['growth', 'revenue', 'earnings', 'forecast', 'guidance', 'strategy'];
            const keywordSentences = sentences.filter(sentence => {
                const lowerSentence = sentence.toLowerCase();
                return importantKeywords.some(keyword => lowerSentence.includes(keyword));
            });

            // Add to allPoints if not already included
            keywordSentences.forEach(sentence => {
                const trimmed = sentence.trim();
                if (!allPoints.includes(trimmed)) {
                    allPoints.push(trimmed);
                }
            });
        }

        // Return top points (limit to 5)
        return allPoints.slice(0, 5);
    },

    /**
     * Extract trend insight from comparative analysis
     * @param {string} comparativeAnalysis - Comparative analysis text
     * @returns {string} - Trend insight
     */
    extractTrendInsight: function(comparativeAnalysis) {
        if (!comparativeAnalysis) return "No comparative data available";

        // Look for trend statements in the comparative analysis
        const trendPhrases = [
            'trend', 'trajectory', 'over time', 'historical',
            'improving', 'declining', 'consistent', 'pattern'
        ];

        const sentences = comparativeAnalysis.match(/[^.!?]+[.!?]+/g) || [];

        // Find sentences containing trend phrases
        const trendSentences = sentences.filter(sentence => {
            const lowerSentence = sentence.toLowerCase();
            return trendPhrases.some(phrase => lowerSentence.includes(phrase));
        });

        if (trendSentences.length > 0) {
            // Return the first trend sentence, cleaned up
            return trendSentences[0].trim();
        }

        // If no specific trend sentence found, return a generic one
        return "Comparative analysis available in full report";
    },

    /**
     * Enhance formatted text with highlighted sections
     * @param {string} text - Analysis text
     * @returns {string} - Enhanced HTML
     */
    enhanceFormattedText: function(text) {
        if (!text) return '<p>No analysis available.</p>';

        // Simple markdown formatting
        let html = this.formatMarkdown(text);

        // Highlight key metrics with a special class
        html = html.replace(/(\d+(\.\d+)?%)/g, '<span class="highlight-metric">$1</span>');
        html = html.replace(/(\$\d+(.\d+)?\s?(million|billion|B|M)?)/g, '<span class="highlight-metric">$1</span>');

        // Highlight positive and negative terms
        const positiveTerms = ['growth', 'increase', 'improved', 'positive', 'strong', 'exceeded', 'opportunities'];
        const negativeTerms = ['decline', 'decrease', 'reduced', 'negative', 'weak', 'missed', 'challenges'];

        positiveTerms.forEach(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            html = html.replace(regex, `<span class="highlight-positive">$&</span>`);
        });

        negativeTerms.forEach(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            html = html.replace(regex, `<span class="highlight-negative">$&</span>`);
        });

        return html;
    },

    /**
     * Format markdown text for display
     * @param {string} markdown - Markdown text
     * @returns {string} - HTML formatted text
     */
    formatMarkdown: function(markdown) {
        if (!markdown) return '<p>No analysis available.</p>';

        // Simple markdown formatting
        let html = markdown
            // Headers
            .replace(/^### (.*$)/gim, '<h5>$1</h5>')
            .replace(/^## (.*$)/gim, '<h4>$1</h4>')
            .replace(/^# (.*$)/gim, '<h3>$1</h3>')

            // Bold and italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')

            // Lists
            .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
            .replace(/^(\d+)\. (.*$)/gim, '<ol><li>$2</li></ol>')

            // Paragraphs
            .replace(/\n\n/g, '</p><p>');

        // Wrap in paragraph tags
        html = '<p>' + html + '</p>';

        // Fix nested lists
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        html = html.replace(/<\/ol>\s*<ol>/g, '');

        return html;
    },

    /**
     * Render transcript content
     * @param {Object} transcript - Transcript data
     * @returns {string} - HTML for transcript display
     */
    renderTranscript: function(transcript) {
        if (!transcript || !transcript.transcript || transcript.transcript.length === 0) {
            return '<p>No transcript content available.</p>';
        }

        let html = '<div class="transcript-container">';

        transcript.transcript.forEach((entry, index) => {
            const sentimentClass = getSentimentClass(entry.sentiment);

            html += `
                <div class="transcript-entry ${index % 2 === 0 ? 'bg-light' : ''} p-3 mb-2">
                    <div class="speaker-info d-flex justify-content-between mb-2">
                        <div>
                            <strong>${entry.speaker}</strong> 
                            ${entry.title ? `<span class="text-muted">(${entry.title})</span>` : ''}
                        </div>
                        <div class="sentiment-indicator ${sentimentClass}">
                            ${this.formatSentiment(entry.sentiment)}
                        </div>
                    </div>
                    <div class="content">
                        ${entry.content}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * Format sentiment score for display
     * @param {number} sentiment - Sentiment score
     * @returns {string} - Formatted sentiment text
     */
    formatSentiment: function(sentiment) {
        if (!sentiment && sentiment !== 0) return 'N/A';

        const score = parseFloat(sentiment).toFixed(2);
        let icon, label;

        if (score >= 0.5) {
            icon = 'bi-emoji-smile-fill';
            label = 'Very Positive';
        } else if (score >= 0.1) {
            icon = 'bi-emoji-smile';
            label = 'Positive';
        } else if (score <= -0.5) {
            icon = 'bi-emoji-frown-fill';
            label = 'Very Negative';
        } else if (score <= -0.1) {
            icon = 'bi-emoji-frown';
            label = 'Negative';
        } else {
            icon = 'bi-emoji-neutral';
            label = 'Neutral';
        }

        return `<i class="bi ${icon}"></i> ${label} (${score})`;
    },

    /**
     * Format metric value (percentage or absolute)
     * @param {number|string} value - Metric value
     * @param {boolean} isPercentage - Whether value is a percentage
     * @returns {string} - Formatted value
     */
    formatMetricValue: function(value, isPercentage) {
        if (isPercentage) {
            // For percentage values
            return `${value}%`;
        } else {
            // For non-percentage values (likely dollar amounts)
            return value;
        }
    },

    /**
     * Get metric sentiment class based on value
     * @param {number} value - Metric value
     * @param {boolean} isPercentage - Whether value is a percentage
     * @returns {string} - CSS class
     */
    getMetricSentimentClass: function(value, isPercentage) {
        if (!isPercentage) return ''; // No coloring for non-percentage values

        // For percentages, positive values are good, negative are bad
        if (value > 10) return 'metric-very-positive';
        if (value > 0) return 'metric-positive';
        if (value < -10) return 'metric-very-negative';
        if (value < 0) return 'metric-negative';
        return '';
    },

    /**
     * Initialize Bootstrap components
     */
    initializeBootstrapComponents: function() {
        // Initialize tabs if not already initialized
        const tabElements = document.querySelectorAll('#transcriptTabs button');
        tabElements.forEach(tab => {
            tab.addEventListener('click', function(event) {
                event.preventDefault();
                const tabTarget = document.querySelector(this.getAttribute('data-bs-target'));

                // Hide all tab panes
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('show', 'active');
                });

                // Remove active class from all tabs
                tabElements.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });

                // Activate the clicked tab
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                // Show the selected tab pane
                tabTarget.classList.add('show', 'active');
            });
        });
    },

    /**
     * Setup collapsible sections
     */
    setupCollapsibleSections: function() {
        // Add click handlers for any collapsible sections
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', function() {
                const content = this.nextElementSibling;
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                    this.classList.remove('active');
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                    this.classList.add('active');
                }
            });
        });
    },

    /**
     * Truncate text to a specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} - Truncated text
     */
    truncateText: function(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    },

    /**
     * Generate and download a PDF report
     * @param {string} symbol - Stock symbol
     * @param {string} quarter - Quarter code
     */
    downloadAnalysisPDF: function(symbol, quarter) {
        App.showNotification(`PDF report for ${symbol} ${quarter} would be generated here.`, 'info');
    }
};

export default TranscriptsView;