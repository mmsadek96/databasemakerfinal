<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Performance Tester for Captain CRM
 *
 * Compares performance between WordPress and MongoDB queries
 */
class Captain_Performance_Tester {
    /**
     * @var Captain_MongoDB_Integration MongoDB integration instance
     */
    private $mongodb;

    /**
     * Constructor
     */
    public function __construct() {
        // Only initialize if MongoDB is available
        if (class_exists('Captain_MongoDB_Integration')) {
            $this->mongodb = Captain_MongoDB_Integration::get_instance();

            // Register admin page
            add_action('admin_menu', array($this, 'add_performance_page'));

            // Register AJAX handlers for performance tests
            add_action('wp_ajax_captain_test_performance', array($this, 'ajax_test_performance'));
        }
    }

    /**
     * Add Performance Test admin page
     */
    public function add_performance_page() {
        add_submenu_page(
            'edit.php?post_type=booking',
            'Performance Tests',
            'Performance Tests',
            'manage_options',
            'captain-performance-tests',
            array($this, 'render_performance_page')
        );
    }

    /**
     * Render Performance Test admin page
     */
    public function render_performance_page() {
        // Check if MongoDB is enabled and working
        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            echo '<div class="wrap">';
            echo '<h1>Performance Testing</h1>';
            echo '<div class="notice notice-error"><p>MongoDB integration is not enabled or not working. Please enable it in the settings page first.</p></div>';
            echo '</div>';
            return;
        }

        ?>
        <div class="wrap">
            <h1>Performance Testing</h1>

            <p>This tool helps you compare the performance of WordPress and MongoDB queries for your Captain CRM data.</p>

            <div class="notice notice-info">
                <p>Performance testing will run the same query against both WordPress and MongoDB databases and measure the execution time. This helps you identify which data storage method is more efficient for your specific use case and data volume.</p>
            </div>

            <div class="card" style="max-width: 800px; margin-top: 20px;">
                <h2>Available Tests</h2>

                <form id="performance-test-form">
                    <table class="widefat" style="margin-bottom: 20px;">
                        <thead>
                            <tr>
                                <th>Test</th>
                                <th>Description</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Client Bookings</td>
                                <td>Retrieves all bookings for a specific client</td>
                                <td>
                                    <select name="client_id" id="client-select">
                                        <option value="">Select Client</option>
                                        <?php
                                        // Get some clients for testing
                                        $clients = get_posts(array(
                                            'post_type' => 'client',
                                            'posts_per_page' => 20,
                                            'orderby' => 'title',
                                            'order' => 'ASC'
                                        ));

                                        foreach ($clients as $client) {
                                            echo '<option value="' . esc_attr($client->ID) . '">' . esc_html($client->post_title) . '</option>';
                                        }
                                        ?>
                                    </select>
                                    <button type="button" class="button run-test" data-test="client_bookings">Run Test</button>
                                </td>
                            </tr>
                            <tr>
                                <td>Calendar Events</td>
                                <td>Retrieves all calendar events for a date range</td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <input type="date" id="start-date" name="start_date" value="<?php echo date('Y-m-01'); ?>">
                                        <span>to</span>
                                        <input type="date" id="end-date" name="end_date" value="<?php echo date('Y-m-t'); ?>">
                                    </div>
                                    <button type="button" class="button run-test" data-test="calendar">Run Test</button>
                                </td>
                            </tr>
                            <tr>
                                <td>Reports Data</td>
                                <td>Generates reports data for a specific period</td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <select name="report_year" id="report-year">
                                            <?php
                                            $current_year = date('Y');
                                            for ($year = $current_year; $year >= $current_year - 2; $year--) {
                                                echo '<option value="' . $year . '">' . $year . '</option>';
                                            }
                                            ?>
                                        </select>
                                        <select name="report_month" id="report-month">
                                            <option value="0">All Months</option>
                                            <?php
                                            for ($month = 1; $month <= 12; $month++) {
                                                echo '<option value="' . $month . '">' . date('F', mktime(0, 0, 0, $month, 1)) . '</option>';
                                            }
                                            ?>
                                        </select>
                                    </div>
                                    <button type="button" class="button run-test" data-test="report">Run Test</button>
                                </td>
                            </tr>
                            <tr>
                                <td>General Query</td>
                                <td>Tests general query performance with different filter options</td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <select name="query_type" id="query-type">
                                            <option value="service_type">Filter by Service Type</option>
                                            <option value="destination">Filter by Destination</option>
                                            <option value="status">Filter by Status</option>
                                        </select>
                                        <select name="query_value" id="query-value">
                                            <option value="charter">Charter</option>
                                            <option value="flotilla">Flotilla</option>
                                            <option value="instruction">Instruction</option>
                                            <option value="delivery">Delivery</option>
                                        </select>
                                    </div>
                                    <button type="button" class="button run-test" data-test="general_query">Run Test</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </form>

                <div id="test-results" style="display: none;">
                    <h3>Test Results</h3>
                    <div id="results-container"></div>
                </div>

                <div id="performance-history" style="margin-top: 20px;">
                    <h3>Performance Test History</h3>
                    <p>Recent test results will appear here. Run a test to see results.</p>
                    <div id="history-container"></div>
                </div>
            </div>
        </div>

        <script>
        jQuery(document).ready(function($) {
            var testHistory = [];

            // Update query value options when query type changes
            $('#query-type').on('change', function() {
                var queryType = $(this).val();
                var $queryValue = $('#query-value');

                $queryValue.empty();

                if (queryType === 'service_type') {
                    $queryValue.append('<option value="charter">Charter</option>');
                    $queryValue.append('<option value="flotilla">Flotilla</option>');
                    $queryValue.append('<option value="instruction">Instruction</option>');
                    $queryValue.append('<option value="delivery">Delivery</option>');
                } else if (queryType === 'destination') {
                    $queryValue.append('<option value="greece">Greece</option>');
                    $queryValue.append('<option value="bvi">British Virgin Islands</option>');
                    $queryValue.append('<option value="croatia">Croatia</option>');
                    $queryValue.append('<option value="italy">Italy</option>');
                    $queryValue.append('<option value="other">Other</option>');
                } else if (queryType === 'status') {
                    $queryValue.append('<option value="inquiry">Inquiry</option>');
                    $queryValue.append('<option value="pending">Pending</option>');
                    $queryValue.append('<option value="confirmed">Confirmed</option>');
                    $queryValue.append('<option value="completed">Completed</option>');
                    $queryValue.append('<option value="cancelled">Cancelled</option>');
                }
            });

            // Handle run test button clicks
            $('.run-test').on('click', function() {
                var testType = $(this).data('test');
                var $button = $(this);

                // Validate required fields
                if (testType === 'client_bookings' && !$('#client-select').val()) {
                    alert('Please select a client to run this test.');
                    return;
                }

                // Disable button and show loading state
                $button.prop('disabled', true).text('Running Test...');

                // Gather test parameters
                var testParams = {
                    test_type: testType,
                    client_id: $('#client-select').val(),
                    start_date: $('#start-date').val(),
                    end_date: $('#end-date').val(),
                    report_year: $('#report-year').val(),
                    report_month: $('#report-month').val(),
                    query_type: $('#query-type').val(),
                    query_value: $('#query-value').val()
                };

                // Run the test
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'captain_test_performance',
                        nonce: '<?php echo wp_create_nonce('captain_performance_nonce'); ?>',
                        test_params: testParams
                    },
                    success: function(response) {
                        if (response.success) {
                            // Add to test history
                            testHistory.unshift({
                                timestamp: new Date(),
                                testType: testType,
                                results: response.data
                            });

                            // Only keep last 5 tests
                            if (testHistory.length > 5) {
                                testHistory.pop();
                            }

                            // Show results
                            displayTestResults(response.data);
                            updateTestHistory();
                        } else {
                            alert('Test failed: ' + response.data);
                        }

                        // Re-enable button
                        $button.prop('disabled', false).text('Run Test');
                    },
                    error: function() {
                        alert('An error occurred while running the test.');
                        $button.prop('disabled', false).text('Run Test');
                    }
                });
            });

            // Display test results
            function displayTestResults(results) {
                var $container = $('#results-container');
                $container.empty();

                var html = '<div class="test-result-card" style="background: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">';
                html += '<h4>' + results.test_name + '</h4>';
                html += '<p><strong>Description:</strong> ' + results.description + '</p>';

                // Add query parameters if available
                if (results.parameters) {
                    html += '<p><strong>Parameters:</strong> ';
                    $.each(results.parameters, function(key, value) {
                        html += key + ': ' + value + ', ';
                    });
                    html = html.slice(0, -2); // Remove trailing comma
                    html += '</p>';
                }

                // Performance comparison table
                html += '<table class="widefat" style="margin-top: 10px;">';
                html += '<thead><tr><th>System</th><th>Time (ms)</th><th>Memory (KB)</th><th>Records</th></tr></thead>';
                html += '<tbody>';

                // WordPress results
                html += '<tr>';
                html += '<td>WordPress</td>';
                html += '<td>' + results.wordpress.time + '</td>';
                html += '<td>' + results.wordpress.memory + '</td>';
                html += '<td>' + results.wordpress.records + '</td>';
                html += '</tr>';

                // MongoDB results
                html += '<tr>';
                html += '<td>MongoDB</td>';
                html += '<td>' + results.mongodb.time + '</td>';
                html += '<td>' + results.mongodb.memory + '</td>';
                html += '<td>' + results.mongodb.records + '</td>';
                html += '</tr>';

                // Performance difference
                var timeDiff = results.wordpress.time - results.mongodb.time;
                var timePercent = (results.wordpress.time / results.mongodb.time * 100) - 100;

                html += '<tr>';
                html += '<td colspan="4" style="text-align: right;">';
                if (timeDiff > 0) {
                    html += '<strong style="color: green;">MongoDB is ' + Math.abs(timePercent).toFixed(2) + '% faster!</strong>';
                } else if (timeDiff < 0) {
                    html += '<strong style="color: orange;">WordPress is ' + Math.abs(timePercent).toFixed(2) + '% faster!</strong>';
                } else {
                    html += '<strong>Both methods performed equally</strong>';
                }
                html += '</td>';
                html += '</tr>';

                html += '</tbody></table>';
                html += '</div>';

                $container.html(html);
                $('#test-results').show();
            }

            // Update test history display
            function updateTestHistory() {
                var $container = $('#history-container');
                $container.empty();

                if (testHistory.length === 0) {
                    $container.html('<p>No test history available yet.</p>');
                    return;
                }

                var html = '<table class="widefat">';
                html += '<thead><tr><th>Time</th><th>Test</th><th>WP Time</th><th>MongoDB Time</th><th>Difference</th></tr></thead>';
                html += '<tbody>';

                $.each(testHistory, function(index, test) {
                    var results = test.results;
                    var timeDiff = results.wordpress.time - results.mongodb.time;
                    var timePercent = (results.wordpress.time / results.mongodb.time * 100) - 100;

                    html += '<tr>';
                    html += '<td>' + test.timestamp.toLocaleTimeString() + '</td>';
                    html += '<td>' + results.test_name + '</td>';
                    html += '<td>' + results.wordpress.time + 'ms</td>';
                    html += '<td>' + results.mongodb.time + 'ms</td>';

                    if (timeDiff > 0) {
                        html += '<td style="color: green;">MongoDB faster by ' + Math.abs(timePercent).toFixed(2) + '%</td>';
                    } else if (timeDiff < 0) {
                        html += '<td style="color: orange;">WordPress faster by ' + Math.abs(timePercent).toFixed(2) + '%</td>';
                    } else {
                        html += '<td>Equal</td>';
                    }

                    html += '</tr>';
                });

                html += '</tbody></table>';
                $container.html(html);
            }
        });
        </script>
        <?php
    }

    /**
     * AJAX handler for performance tests
     */
    public function ajax_test_performance() {
        check_ajax_referer('captain_performance_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
            return;
        }

        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            wp_send_json_error('MongoDB integration is not enabled');
            return;
        }

        // Get test parameters
        $test_params = isset($_POST['test_params']) ? $_POST['test_params'] : array();
        $test_type = isset($test_params['test_type']) ? sanitize_text_field($test_params['test_type']) : '';

        if (empty($test_type)) {
            wp_send_json_error('Invalid test type');
            return;
        }

        // Run the appropriate test
        switch ($test_type) {
            case 'client_bookings':
                $results = $this->test_client_bookings($test_params);
                break;

            case 'calendar':
                $results = $this->test_calendar_events($test_params);
                break;

            case 'report':
                $results = $this->test_report_data($test_params);
                break;

            case 'general_query':
                $results = $this->test_general_query($test_params);
                break;

            default:
                wp_send_json_error('Unknown test type');
                return;
        }

        wp_send_json_success($results);
    }

    /**
     * Test client bookings performance
     *
     * @param array $params Test parameters
     * @return array Test results
     */
    private function test_client_bookings($params) {
        $client_id = isset($params['client_id']) ? intval($params['client_id']) : 0;

        if (!$client_id) {
            return array(
                'error' => 'No client selected'
            );
        }

        // Test WordPress performance
        $wp_start_time = microtime(true);
        $wp_start_memory = memory_get_usage();

        $wp_bookings = get_posts(array(
            'post_type' => 'booking',
            'posts_per_page' => -1,
            'meta_key' => '_booking_client_id',
            'meta_value' => $client_id,
            'meta_compare' => '='
        ));

        $wp_end_time = microtime(true);
        $wp_end_memory = memory_get_usage();

        $wp_time = round(($wp_end_time - $wp_start_time) * 1000, 2); // Convert to milliseconds
        $wp_memory = round(($wp_end_memory - $wp_start_memory) / 1024, 2); // Convert to KB
        $wp_count = count($wp_bookings);

        // Test MongoDB performance
        $mongo_start_time = microtime(true);
        $mongo_start_memory = memory_get_usage();

        $mongo_bookings = $this->mongodb->get_client_bookings($client_id, 'all', 999, 0);

        $mongo_end_time = microtime(true);
        $mongo_end_memory = memory_get_usage();

        $mongo_time = round(($mongo_end_time - $mongo_start_time) * 1000, 2); // Convert to milliseconds
        $mongo_memory = round(($mongo_end_memory - $mongo_start_memory) / 1024, 2); // Convert to KB
        $mongo_count = is_array($mongo_bookings) ? count($mongo_bookings) : 0;

        // Format results
        return array(
            'test_name' => 'Client Bookings Performance Test',
            'description' => 'Retrieves all bookings for a specific client',
            'parameters' => array(
                'client_id' => $client_id,
                'client_name' => get_the_title($client_id)
            ),
            'wordpress' => array(
                'time' => $wp_time,
                'memory' => $wp_memory,
                'records' => $wp_count
            ),
            'mongodb' => array(
                'time' => $mongo_time,
                'memory' => $mongo_memory,
                'records' => $mongo_count
            )
        );
    }

    /**
     * Test calendar events performance
     *
     * @param array $params Test parameters
     * @return array Test results
     */
    private function test_calendar_events($params) {
        $start_date = isset($params['start_date']) ? sanitize_text_field($params['start_date']) : date('Y-m-01');
        $end_date = isset($params['end_date']) ? sanitize_text_field($params['end_date']) : date('Y-m-t');

        // Test WordPress performance
        $wp_start_time = microtime(true);
        $wp_start_memory = memory_get_usage();

        $wp_events = captain_get_calendar_events_wp($start_date, $end_date);

        $wp_end_time = microtime(true);
        $wp_end_memory = memory_get_usage();

        $wp_time = round(($wp_end_time - $wp_start_time) * 1000, 2);
        $wp_memory = round(($wp_end_memory - $wp_start_memory) / 1024, 2);
        $wp_count = count($wp_events);

        // Test MongoDB performance
        $mongo_start_time = microtime(true);
        $mongo_start_memory = memory_get_usage();

        $mongo_events = $this->mongodb->get_calendar_events($start_date, $end_date);

        $mongo_end_time = microtime(true);
        $mongo_end_memory = memory_get_usage();

        $mongo_time = round(($mongo_end_time - $mongo_start_time) * 1000, 2);
        $mongo_memory = round(($mongo_end_memory - $mongo_start_memory) / 1024, 2);
        $mongo_count = is_array($mongo_events) ? count($mongo_events) : 0;

        // Format results
        return array(
            'test_name' => 'Calendar Events Performance Test',
            'description' => 'Retrieves calendar events for a date range',
            'parameters' => array(
                'start_date' => $start_date,
                'end_date' => $end_date
            ),
            'wordpress' => array(
                'time' => $wp_time,
                'memory' => $wp_memory,
                'records' => $wp_count
            ),
            'mongodb' => array(
                'time' => $mongo_time,
                'memory' => $mongo_memory,
                'records' => $mongo_count
            )
        );
    }

    /**
     * Test report data performance
     *
     * @param array $params Test parameters
     * @return array Test results
     */
    private function test_report_data($params) {
        $year = isset($params['report_year']) ? intval($params['report_year']) : date('Y');
        $month = isset($params['report_month']) ? intval($params['report_month']) : 0;

        // Test WordPress performance
        $wp_start_time = microtime(true);
        $wp_start_memory = memory_get_usage();

        $wp_report = captain_generate_report_data_wp($year, $month);

        $wp_end_time = microtime(true);
        $wp_end_memory = memory_get_usage();

        $wp_time = round(($wp_end_time - $wp_start_time) * 1000, 2);
        $wp_memory = round(($wp_end_memory - $wp_start_memory) / 1024, 2);
        $wp_count = $wp_report['total_bookings'];

        // Test MongoDB performance
        $mongo_start_time = microtime(true);
        $mongo_start_memory = memory_get_usage();

        $mongo_report = $this->mongodb->generate_report_data($year, $month);

        $mongo_end_time = microtime(true);
        $mongo_end_memory = memory_get_usage();

        $mongo_time = round(($mongo_end_time - $mongo_start_time) * 1000, 2);
        $mongo_memory = round(($mongo_end_memory - $mongo_start_memory) / 1024, 2);
        $mongo_count = $mongo_report ? $mongo_report['total_bookings'] : 0;

        // Format results
        return array(
            'test_name' => 'Reports Data Performance Test',
            'description' => 'Generates reports data for a specific period',
            'parameters' => array(
                'year' => $year,
                'month' => $month ? date('F', mktime(0, 0, 0, $month, 1)) : 'All Months'
            ),
            'wordpress' => array(
                'time' => $wp_time,
                'memory' => $wp_memory,
                'records' => $wp_count
            ),
            'mongodb' => array(
                'time' => $mongo_time,
                'memory' => $mongo_memory,
                'records' => $mongo_count
            )
        );
    }

    /**
     * Test general query performance
     *
     * @param array $params Test parameters
     * @return array Test results
     */
    private function test_general_query($params) {
        $query_type = isset($params['query_type']) ? sanitize_text_field($params['query_type']) : 'service_type';
        $query_value = isset($params['query_value']) ? sanitize_text_field($params['query_value']) : '';

        // Test WordPress performance
        $wp_start_time = microtime(true);
        $wp_start_memory = memory_get_usage();

        $args = array(
            'post_type' => 'booking',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        );

        if ($query_type === 'service_type') {
            $args['meta_query'] = array(
                array(
                    'key' => '_booking_service_type',
                    'value' => $query_value
                )
            );
        } elseif ($query_type === 'destination') {
            $args['meta_query'] = array(
                array(
                    'key' => '_booking_destination',
                    'value' => $query_value
                )
            );
        } elseif ($query_type === 'status') {
            $args['tax_query'] = array(
                array(
                    'taxonomy' => 'booking_status',
                    'field' => 'slug',
                    'terms' => $query_value
                )
            );
        }

        $wp_query = new WP_Query($args);
        $wp_bookings = $wp_query->posts;

        $wp_end_time = microtime(true);
        $wp_end_memory = memory_get_usage();

        $wp_time = round(($wp_end_time - $wp_start_time) * 1000, 2);
        $wp_memory = round(($wp_end_memory - $wp_start_memory) / 1024, 2);
        $wp_count = count($wp_bookings);

        // Test MongoDB performance
        $mongo_start_time = microtime(true);
        $mongo_start_memory = memory_get_usage();

        $db = $this->mongodb->get_db();

        $filter = array();
        if ($query_type === 'service_type') {
            $filter['service_type'] = $query_value;
        } elseif ($query_type === 'destination') {
            $filter['destination'] = $query_value;
        } elseif ($query_type === 'status') {
            $filter['status'] = $query_value;
        }

        $mongo_bookings = $db->bookings->find($filter)->toArray();

        $mongo_end_time = microtime(true);
        $mongo_end_memory = memory_get_usage();

        $mongo_time = round(($mongo_end_time - $mongo_start_time) * 1000, 2);
        $mongo_memory = round(($mongo_end_memory - $mongo_start_memory) / 1024, 2);
        $mongo_count = count($mongo_bookings);

        // Format results
        return array(
            'test_name' => 'General Query Performance Test',
            'description' => 'Tests general query performance with filter options',
            'parameters' => array(
                'filter_type' => $query_type,
                'filter_value' => $query_value
            ),
            'wordpress' => array(
                'time' => $wp_time,
                'memory' => $wp_memory,
                'records' => $wp_count
            ),
            'mongodb' => array(
                'time' => $mongo_time,
                'memory' => $mongo_memory,
                'records' => $mongo_count
            )
        );
    }
}

// Initialize Performance Tester
function captain_performance_tester_init() {
    // Only initialize if MongoDB is enabled
    if (get_option('captain_mongodb_enabled', '0') === '1') {
        new Captain_Performance_Tester();
    }
}
add_action('plugins_loaded', 'captain_performance_tester_init');