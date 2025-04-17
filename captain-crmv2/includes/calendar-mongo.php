<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Handle calendar AJAX requests with MongoDB support
function captain_get_calendar_events() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_calendar_nonce')) {
        wp_send_json_error('Security check failed');
        wp_die();
    }

    // Get and sanitize the AJAX request parameters
    $start = isset($_POST['start']) ? sanitize_text_field($_POST['start']) : '';
    $end = isset($_POST['end']) ? sanitize_text_field($_POST['end']) : '';
    $service = isset($_POST['service']) ? sanitize_text_field($_POST['service']) : '';
    $crew = isset($_POST['crew']) ? sanitize_text_field($_POST['crew']) : '';

    // Check if we should use MongoDB
    $use_mongodb = false;
    $mongodb = null;

    if (class_exists('Captain_MongoDB_Integration')) {
        $mongodb = Captain_MongoDB_Integration::get_instance();
        $use_mongodb = $mongodb && $mongodb->is_enabled();
    }

    if ($use_mongodb) {
        // Use MongoDB to get calendar events
        $filters = array(
            'service' => $service,
            'crew' => $crew
        );

        $events = $mongodb->get_calendar_events($start, $end, $filters);

        // Fall back to WordPress if MongoDB query fails
        if ($events === false) {
            $events = captain_get_calendar_events_wp($start, $end, $service, $crew);
        }
    } else {
        // Use WordPress method
        $events = captain_get_calendar_events_wp($start, $end, $service, $crew);
    }

    wp_send_json_success($events);
}

// Get calendar events using WordPress (original implementation)
function captain_get_calendar_events_wp($start, $end, $service = '', $crew = '') {
    // Build query arguments for bookings
    $args = array(
        'post_type' => 'booking',
        'posts_per_page' => -1,
        'post_status' => 'publish',
        'meta_query' => array('relation' => 'AND')
    );

    // Add service filter if provided
    if (!empty($service)) {
        $args['meta_query'][] = array(
            'key' => '_booking_service_type',
            'value' => $service,
            'compare' => '='
        );
    }

    // Add crew filter if provided
    if (!empty($crew)) {
        $args['meta_query'][] = array(
            'key' => '_booking_crew_services',
            'value' => $crew,
            'compare' => '='
        );
    }

    $query = new WP_Query($args);
    $events = array();

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $booking_id = get_the_ID();

            // Filter events by date range if needed
            $start_date = get_post_meta($booking_id, '_booking_start_date', true);
            $end_date = get_post_meta($booking_id, '_booking_end_date', true);

            // Skip if no start date
            if (empty($start_date)) {
                continue;
            }

            // If end date is empty, use start date
            if (empty($end_date)) {
                $end_date = $start_date;
            }

            // Skip if event ends before the requested start or starts after the requested end
            if (($end && strtotime($start_date) > strtotime($end)) ||
                ($start && strtotime($end_date) < strtotime($start))) {
                continue;
            }

            // Get service type for event color
            $service_type = get_post_meta($booking_id, '_booking_service_type', true);

            // Build the event object
            $events[] = array(
                'id' => $booking_id,
                'title' => get_the_title(),
                'start' => $start_date,
                'end' => $end_date,
                'url' => admin_url('post.php?post=' . $booking_id . '&action=edit'),
                'className' => 'event-' . $service_type
            );
        }
    }
    wp_reset_postdata();

    return $events;
}