<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Add Calendar View page to admin menu
function captain_add_calendar_page() {
    add_submenu_page(
        'edit.php?post_type=booking',
        'Booking Calendar',
        'Calendar',
        'manage_options',
        'captain-calendar',
        'captain_calendar_page_callback'
    );
}
add_action('admin_menu', 'captain_add_calendar_page');

// Calendar page callback
function captain_calendar_page_callback() {
    // Include the calendar template
    include CAPTAIN_CRM_PLUGIN_DIR . 'templates/calendar-page.php';
}

// Add Export page to admin menu
function captain_add_export_page() {
    add_submenu_page(
        'edit.php?post_type=booking',
        'Export Data',
        'Export Data',
        'manage_options',
        'captain-export',
        'captain_export_page_callback'
    );
}
add_action('admin_menu', 'captain_add_export_page');

// Export page callback
function captain_export_page_callback() {
    // Check if the export form has been submitted
    if (isset($_POST['export']) && check_admin_referer('captain_export_data', 'captain_export_nonce')) {
        // Query all bookings
        $args = array(
            'post_type' => 'booking',
            'post_status' => 'publish',
            'posts_per_page' => -1,
        );
        $query = new WP_Query($args);

        // Build CSV header
        $csv_output = "Booking ID,Title,Client Name,Start Date,End Date,Service Type,Destination,Price\n";

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $booking_id = get_the_ID();
                $title = get_the_title();

                // Get client name from meta data
                $client_id = get_post_meta($booking_id, '_booking_client_id', true);
                $client_name = $client_id ? get_the_title($client_id) : '';

                $start_date = get_post_meta($booking_id, '_booking_start_date', true);
                $end_date = get_post_meta($booking_id, '_booking_end_date', true);
                $service_type = get_post_meta($booking_id, '_booking_service_type', true);
                $destination = get_post_meta($booking_id, '_booking_destination', true);
                $price = get_post_meta($booking_id, '_booking_price', true);

                // Build row with quoted values (to handle commas in content)
                $row = array(
                    $booking_id,
                    $title,
                    $client_name,
                    $start_date,
                    $end_date,
                    $service_type,
                    $destination,
                    $price,
                );
                $csv_output .= '"' . implode('","', $row) . '"' . "\n";
            }
            wp_reset_postdata();
        }

        // Send CSV headers and output the CSV content
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="bookings_export_' . date('Y-m-d') . '.csv"');
        echo $csv_output;
        exit;
    } else {
        // Display the export page with a form
        ?>
        <div class="wrap">
            <h1>Export Data</h1>
            <p>Click the button below to export all booking data as a CSV file.</p>
            <form method="post">
                <?php wp_nonce_field('captain_export_data', 'captain_export_nonce'); ?>
                <input type="submit" name="export" class="button button-primary" value="Export CSV">
            </form>
        </div>
        <?php
    }
}