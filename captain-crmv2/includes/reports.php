<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Add Reports page to admin menu
function captain_add_reports_page() {
    add_submenu_page(
        'edit.php?post_type=booking',
        'Booking Reports',
        'Reports',
        'manage_options',
        'captain-reports',
        'captain_reports_page_callback'
    );
}
add_action('admin_menu', 'captain_add_reports_page');

// Reports page callback
function captain_reports_page_callback() {
    // Get current year and month
    $current_year = date('Y');
    $current_month = date('m');

    // Get selected filters
    $year = isset($_GET['year']) ? intval($_GET['year']) : $current_year;
    $month = isset($_GET['month']) ? intval($_GET['month']) : 0; // 0 means all months
    $service = isset($_GET['service']) ? sanitize_text_field($_GET['service']) : '';
    $destination = isset($_GET['destination']) ? sanitize_text_field($_GET['destination']) : '';

    // Check if we should use MongoDB for reports
    $use_mongodb = false;
    $mongodb = null;

    if (class_exists('Captain_MongoDB_Integration')) {
        $mongodb = Captain_MongoDB_Integration::get_instance();
        $use_mongodb = $mongodb && $mongodb->is_enabled();
    }

    if ($use_mongodb) {
        $report_data = $mongodb->generate_report_data($year, $month, $service, $destination);

        // If MongoDB query failed, fall back to WordPress
        if ($report_data === false) {
            $report_data = captain_generate_report_data_wp($year, $month, $service, $destination);
        }
    } else {
        $report_data = captain_generate_report_data_wp($year, $month, $service, $destination);
    }

    $years = captain_get_booking_years();

    ?>
    <div class="wrap">
        <h1>Booking Reports</h1>

        <?php if ($use_mongodb): ?>
        <div class="notice notice-info">
            <p>Using MongoDB for report generation for improved performance.</p>
        </div>
        <?php endif; ?>

        <div class="report-filters">
            <form method="get">
                <input type="hidden" name="post_type" value="booking">
                <input type="hidden" name="page" value="captain-reports">

                <select name="year">
                    <?php foreach ($years as $y) : ?>
                        <option value="<?php echo $y; ?>" <?php selected($year, $y); ?>><?php echo $y; ?></option>
                    <?php endforeach; ?>
                </select>

                <select name="month">
                    <option value="0" <?php selected($month, 0); ?>>All Months</option>
                    <?php for ($m = 1; $m <= 12; $m++) : ?>
                        <option value="<?php echo $m; ?>" <?php selected($month, $m); ?>><?php echo date('F', mktime(0, 0, 0, $m, 1)); ?></option>
                    <?php endfor; ?>
                </select>

                <select name="service">
                    <option value="" <?php selected($service, ''); ?>>All Services</option>
                    <option value="charter" <?php selected($service, 'charter'); ?>>Private Charter</option>
                    <option value="flotilla" <?php selected($service, 'flotilla'); ?>>Flotilla Leading</option>
                    <option value="instruction" <?php selected($service, 'instruction'); ?>>Sailing Instruction</option>
                    <option value="delivery" <?php selected($service, 'delivery'); ?>>Yacht Delivery</option>
                </select>

                <select name="destination">
                    <option value="" <?php selected($destination, ''); ?>>All Destinations</option>
                    <option value="greece" <?php selected($destination, 'greece'); ?>>Greece</option>
                    <option value="bvi" <?php selected($destination, 'bvi'); ?>>British Virgin Islands</option>
                    <option value="other" <?php selected($destination, 'other'); ?>>Other</option>
                </select>

                <button type="submit" class="button">Filter</button>
            </form>
        </div>

        <div class="report-summary">
            <div class="summary-card">
                <h3>Total Bookings</h3>
                <p class="summary-number"><?php echo $report_data['total_bookings']; ?></p>
            </div>

            <div class="summary-card">
                <h3>Total Revenue</h3>
                <p class="summary-number">€<?php echo number_format($report_data['total_revenue'], 2); ?></p>
            </div>

            <div class="summary-card">
                <h3>Average Booking Value</h3>
                <p class="summary-number">€<?php echo $report_data['total_bookings'] > 0 ? number_format($report_data['total_revenue'] / $report_data['total_bookings'], 2) : 0; ?></p>
            </div>

            <div class="summary-card">
                <h3>Active Days</h3>
                <p class="summary-number"><?php echo $report_data['active_days']; ?></p>
            </div>
        </div>

        <div class="report-charts">
            <div class="chart-container">
                <h3>Bookings by Service Type</h3>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Service Type</th>
                            <th>Bookings</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($report_data['service_stats'] as $service_type => $stats) :
                            $service_labels = array(
                                'charter' => 'Private Charter',
                                'flotilla' => 'Flotilla Leading',
                                'instruction' => 'Sailing Instruction',
                                'delivery' => 'Yacht Delivery'
                            );
                            $label = isset($service_labels[$service_type]) ? $service_labels[$service_type] : $service_type;
                        ?>
                            <tr>
                                <td><?php echo esc_html($label); ?></td>
                                <td><?php echo $stats['count']; ?></td>
                                <td>€<?php echo number_format($stats['revenue'], 2); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <div class="chart-container">
                <h3>Bookings by Destination</h3>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Destination</th>
                            <th>Bookings</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($report_data['destination_stats'] as $dest => $stats) :
                            $destination_labels = array(
                                'greece' => 'Greece',
                                'bvi' => 'British Virgin Islands',
                                'other' => 'Other'
                            );
                            $label = isset($destination_labels[$dest]) ? $destination_labels[$dest] : $dest;
                        ?>
                            <tr>
                                <td><?php echo esc_html($label); ?></td>
                                <td><?php echo $stats['count']; ?></td>
                                <td>€<?php echo number_format($stats['revenue'], 2); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="report-monthly">
            <h3>Monthly Breakdown</h3>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Bookings</th>
                        <th>Revenue</th>
                        <th>Active Days</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    if (empty($report_data['monthly_stats'])) {
                        echo '<tr><td colspan="4">No data available for the selected period.</td></tr>';
                    } else {
                        foreach ($report_data['monthly_stats'] as $m => $stats) :
                            $month_name = date('F', mktime(0, 0, 0, $m, 1));
                    ?>
                        <tr>
                            <td><?php echo $month_name; ?></td>
                            <td><?php echo $stats['count']; ?></td>
                            <td>€<?php echo number_format($stats['revenue'], 2); ?></td>
                            <td><?php echo $stats['days']; ?></td>
                        </tr>
                    <?php
                        endforeach;
                    }
                    ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php
}

// Get years with bookings
function captain_get_booking_years() {
    global $wpdb;
    $years = array();

    // Check if we should use MongoDB for this query
    $use_mongodb = false;
    $mongodb = null;

    if (class_exists('Captain_MongoDB_Integration')) {
        $mongodb = Captain_MongoDB_Integration::get_instance();
        $use_mongodb = $mongodb && $mongodb->is_enabled();
    }

    if ($use_mongodb) {
        try {
            $db = $mongodb->get_db();
            $collection = $db->bookings;

            $pipeline = array(
                array(
                    '$group' => array(
                        '_id' => array('$year' => '$start_date')
                    )
                ),
                array(
                    '$sort' => array('_id' => -1)
                )
            );

            $result = $collection->aggregate($pipeline)->toArray();

            if ($result) {
                foreach ($result as $item) {
                    $years[] = $item['_id'];
                }
            }
        } catch (Exception $e) {
            error_log('MongoDB Years Query Error: ' . $e->getMessage());
            // Fall back to WordPress query if MongoDB fails
            $use_mongodb = false;
        }
    }

    // Fall back to WordPress query if MongoDB is not used or failed
    if (!$use_mongodb) {
        $query = $wpdb->prepare("
            SELECT DISTINCT YEAR(post_date) as year
            FROM {$wpdb->posts}
            WHERE post_type = %s
            AND post_status = %s
            ORDER BY year DESC
        ", 'booking', 'publish');
        $results = $wpdb->get_results($query);

        if ($results) {
            foreach ($results as $result) {
                $years[] = $result->year;
            }
        }
    }

    // If no bookings yet, add current year
    if (empty($years)) {
        $years[] = date('Y');
    }

    return $years;
}

// Generate report data using WordPress queries (original function renamed)
function captain_generate_report_data_wp($year, $month = 0, $service = '', $destination = '') {
    $data = array(
        'total_bookings' => 0,
        'total_revenue' => 0,
        'active_days' => 0,
        'service_stats' => array(),
        'destination_stats' => array(),
        'monthly_stats' => array()
    );

    // Set up the query args
    $args = array(
        'post_type' => 'booking',
        'posts_per_page' => -1,
        'post_status' => 'publish',
        'date_query' => array(
            array(
                'year' => $year
            )
        ),
        'meta_query' => array(
            'relation' => 'AND'
        )
    );

    // Add month filter if specified
    if ($month > 0) {
        $args['date_query'][0]['month'] = $month;
    }

    // Add service filter if specified
    if (!empty($service)) {
        $args['meta_query'][] = array(
            'key' => '_booking_service_type',
            'value' => $service
        );
    }

    // Add destination filter if specified
    if (!empty($destination)) {
        $args['meta_query'][] = array(
            'key' => '_booking_destination',
            'value' => $destination
        );
    }

    // Get bookings that match the criteria
    $bookings_query = new WP_Query($args);
    $bookings = $bookings_query->posts;

    // Process bookings for stats
    if ($bookings) {
        $data['total_bookings'] = count($bookings);
        $active_days = array(); // Track unique days with bookings

        foreach ($bookings as $booking) {
            // Get booking details
            $price = get_post_meta($booking->ID, '_booking_price', true);
            $price = !empty($price) ? floatval($price) : 0;
            $data['total_revenue'] += $price;

            // Get service type stats
            $service_type = get_post_meta($booking->ID, '_booking_service_type', true);
            if (!empty($service_type)) {
                if (!isset($data['service_stats'][$service_type])) {
                    $data['service_stats'][$service_type] = array(
                        'count' => 0,
                        'revenue' => 0
                    );
                }
                $data['service_stats'][$service_type]['count']++;
                $data['service_stats'][$service_type]['revenue'] += $price;
            }

            // Get destination stats
            $dest = get_post_meta($booking->ID, '_booking_destination', true);
            if (!empty($dest)) {
                if (!isset($data['destination_stats'][$dest])) {
                    $data['destination_stats'][$dest] = array(
                        'count' => 0,
                        'revenue' => 0
                    );
                }
                $data['destination_stats'][$dest]['count']++;
                $data['destination_stats'][$dest]['revenue'] += $price;
            }

            // Track days and monthly stats
            $start_date = get_post_meta($booking->ID, '_booking_start_date', true);
            $end_date = get_post_meta($booking->ID, '_booking_end_date', true);

            if (!empty($start_date)) {
                $start = new DateTime($start_date);
                $booking_month = $start->format('n'); // Month without leading zeros

                // Initialize monthly stats if not set
                if (!isset($data['monthly_stats'][$booking_month])) {
                    $data['monthly_stats'][$booking_month] = array(
                        'count' => 0,
                        'revenue' => 0,
                        'days' => 0
                    );
                }

                $data['monthly_stats'][$booking_month]['count']++;
                $data['monthly_stats'][$booking_month]['revenue'] += $price;

                // Count active days
                if (!empty($end_date)) {
                    $end = new DateTime($end_date);
                    $interval = new DateInterval('P1D'); // 1 day interval
                    $date_range = new DatePeriod($start, $interval, $end);

                    // Add each day in the booking to the active days tracker
                    foreach ($date_range as $date) {
                        $day_key = $date->format('Y-m-d');
                        if (!in_array($day_key, $active_days)) {
                            $active_days[] = $day_key;

                            // Track days by month
                            $curr_month = $date->format('n');
                            if (isset($data['monthly_stats'][$curr_month])) {
                                $data['monthly_stats'][$curr_month]['days']++;
                            }
                        }
                    }

                    // Also add the end date
                    $day_key = $end->format('Y-m-d');
                    if (!in_array($day_key, $active_days)) {
                        $active_days[] = $day_key;

                        // Track days by month
                        $curr_month = $end->format('n');
                        if (isset($data['monthly_stats'][$curr_month])) {
                            $data['monthly_stats'][$curr_month]['days']++;
                        }
                    }
                } else {
                    // If no end date, just count the start date
                    $day_key = $start->format('Y-m-d');
                    if (!in_array($day_key, $active_days)) {
                        $active_days[] = $day_key;

                        // Track days by month
                        if (isset($data['monthly_stats'][$booking_month])) {
                            $data['monthly_stats'][$booking_month]['days']++;
                        }
                    }
                }
            }
        }

        $data['active_days'] = count($active_days);
    }

    return $data;
}

// For backwards compatibility
function captain_generate_report_data($year, $month = 0, $service = '', $destination = '') {
    // Check if we should use MongoDB
    $use_mongodb = false;
    $mongodb = null;

    if (class_exists('Captain_MongoDB_Integration')) {
        $mongodb = Captain_MongoDB_Integration::get_instance();
        $use_mongodb = $mongodb && $mongodb->is_enabled();
    }

    if ($use_mongodb) {
        $data = $mongodb->generate_report_data($year, $month, $service, $destination);

        // Fall back to WordPress if MongoDB fails
        if ($data === false) {
            $data = captain_generate_report_data_wp($year, $month, $service, $destination);
        }

        return $data;
    }

    // Use WordPress method
    return captain_generate_report_data_wp($year, $month, $service, $destination);
}