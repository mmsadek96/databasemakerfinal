<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Add Dashboard Widgets
function captain_add_dashboard_widgets() {
    wp_add_dashboard_widget(
        'captain_upcoming_bookings_widget',
        'Upcoming Bookings',
        'captain_upcoming_bookings_widget_callback'
    );

    wp_add_dashboard_widget(
        'captain_recent_inquiries_widget',
        'Recent Inquiries',
        'captain_recent_inquiries_widget_callback'
    );
}
add_action('wp_dashboard_setup', 'captain_add_dashboard_widgets');

// Upcoming Bookings Widget Callback
function captain_upcoming_bookings_widget_callback() {
    // Get today's date
    $today = date('Y-m-d');

    // Get upcoming bookings
    $bookings = get_posts(array(
        'post_type' => 'booking',
        'posts_per_page' => 5,
        'meta_key' => '_booking_start_date',
        'meta_value' => $today,
        'meta_compare' => '>=',
        'order' => 'ASC',
        'orderby' => 'meta_value'
    ));

    if ($bookings) {
        echo '<table class="widefat fixed" style="margin-bottom:10px;">';
        echo '<thead><tr>';
        echo '<th>Client</th>';
        echo '<th>Date</th>';
        echo '<th>Service</th>';
        echo '<th>Status</th>';
        echo '</tr></thead>';
        echo '<tbody>';

        foreach ($bookings as $booking) {
            $client_id = get_post_meta($booking->ID, '_booking_client_id', true);
            $client_name = $client_id ? get_the_title($client_id) : 'No client selected';

            $start_date = get_post_meta($booking->ID, '_booking_start_date', true);
            $service_type = get_post_meta($booking->ID, '_booking_service_type', true);

            // Get booking status
            $status_terms = get_the_terms($booking->ID, 'booking_status');
            $status = $status_terms ? $status_terms[0]->name : 'No status';

            // Format service type for display
            $service_types = array(
                'charter' => 'Private Charter',
                'flotilla' => 'Flotilla Leading',
                'instruction' => 'Sailing Instruction',
                'delivery' => 'Yacht Delivery'
            );
            $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;

            // Format date
            $date_display = date('M j, Y', strtotime($start_date));

            echo '<tr>';
            echo '<td><a href="' . get_edit_post_link($booking->ID) . '">' . esc_html($client_name) . '</a></td>';
            echo '<td>' . esc_html($date_display) . '</td>';
            echo '<td>' . esc_html($service_display) . '</td>';
            echo '<td>' . esc_html($status) . '</td>';
            echo '</tr>';
        }

        echo '</tbody></table>';
        echo '<p><a href="' . admin_url('edit.php?post_type=booking') . '">View all bookings</a></p>';
    } else {
        echo '<p>No upcoming bookings found.</p>';
    }
}

// Recent Inquiries Widget Callback
function captain_recent_inquiries_widget_callback() {
    // Get inquiries (bookings with 'inquiry' status)
    $inquiries = get_posts(array(
        'post_type' => 'booking',
        'posts_per_page' => 5,
        'order' => 'DESC',
        'orderby' => 'date',
        'tax_query' => array(
            array(
                'taxonomy' => 'booking_status',
                'field' => 'slug',
                'terms' => 'inquiry'
            )
        )
    ));

    if ($inquiries) {
        echo '<table class="widefat fixed" style="margin-bottom:10px;">';
        echo '<thead><tr>';
        echo '<th>Client</th>';
        echo '<th>Date Received</th>';
        echo '<th>Service</th>';
        echo '</tr></thead>';
        echo '<tbody>';

        foreach ($inquiries as $inquiry) {
            $client_id = get_post_meta($inquiry->ID, '_booking_client_id', true);
            $client_name = $client_id ? get_the_title($client_id) : 'No client selected';

            $service_type = get_post_meta($inquiry->ID, '_booking_service_type', true);

            // Format service type for display
            $service_types = array(
                'charter' => 'Private Charter',
                'flotilla' => 'Flotilla Leading',
                'instruction' => 'Sailing Instruction',
                'delivery' => 'Yacht Delivery'
            );
            $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;

            echo '<tr>';
            echo '<td><a href="' . get_edit_post_link($inquiry->ID) . '">' . esc_html($client_name) . '</a></td>';
            echo '<td>' . get_the_date('M j, Y', $inquiry->ID) . '</td>';
            echo '<td>' . esc_html($service_display) . '</td>';
            echo '</tr>';
        }

        echo '</tbody></table>';
        echo '<p><a href="' . admin_url('edit.php?post_type=booking&booking_status=inquiry') . '">View all inquiries</a></p>';
    } else {
        echo '<p>No recent inquiries found.</p>';
    }
}