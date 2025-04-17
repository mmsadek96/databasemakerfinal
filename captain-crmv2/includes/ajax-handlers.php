<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Process the booking form submission via AJAX
function captain_process_booking_form() {
    // Add logging for debugging
    error_log('AJAX booking form submission received: ' . print_r($_POST, true));

    // Verify nonce
    if (!isset($_POST['booking_nonce']) || !wp_verify_nonce($_POST['booking_nonce'], 'captain_booking_nonce')) {
        error_log('Booking form nonce verification failed');
        wp_send_json_error('Security check failed');
        return;
    }

    // Get form data
    $client_name = isset($_POST['client_name']) ? sanitize_text_field($_POST['client_name']) : '';
    $client_email = isset($_POST['client_email']) ? sanitize_email($_POST['client_email']) : '';
    $client_phone = isset($_POST['client_phone']) ? sanitize_text_field($_POST['client_phone']) : '';
    $client_nationality = isset($_POST['client_nationality']) ? sanitize_text_field($_POST['client_nationality']) : '';
    $client_experience = isset($_POST['experience']) ? sanitize_text_field($_POST['experience']) : '';

    $service_type = isset($_POST['service_type']) ? sanitize_text_field($_POST['service_type']) : '';
    $destination = isset($_POST['destination']) ? sanitize_text_field($_POST['destination']) : '';
    $start_date = isset($_POST['start_date']) ? sanitize_text_field($_POST['start_date']) : '';
    $end_date = isset($_POST['end_date']) ? sanitize_text_field($_POST['end_date']) : '';
    $crew_size = isset($_POST['crew_size']) ? intval($_POST['crew_size']) : 0;
    $crew_services = isset($_POST['crew_services']) ? sanitize_text_field($_POST['crew_services']) : '';
    $message = isset($_POST['message']) ? sanitize_textarea_field($_POST['message']) : '';

    // Validate required fields
    if (empty($client_name) || empty($client_email) || empty($client_phone) || empty($service_type) || empty($destination) || empty($start_date)) {
        error_log('Booking form validation failed - missing required fields');
        wp_send_json_error('Please fill in all required fields');
        return;
    }

    // Check if client already exists (by email)
    $existing_clients = get_posts(array(
        'post_type' => 'client',
        'posts_per_page' => 1,
        'meta_key' => '_client_email',
        'meta_value' => $client_email,
        'meta_compare' => '='
    ));

    if ($existing_clients) {
        // Use existing client
        $client_id = $existing_clients[0]->ID;
        error_log('Using existing client #' . $client_id);
    } else {
        // Create new client
        $client_id = wp_insert_post(array(
            'post_type' => 'client',
            'post_title' => $client_name,
            'post_status' => 'publish'
        ));

        error_log('Creating new client with result: ' . (is_wp_error($client_id) ? $client_id->get_error_message() : $client_id));

        // Add client meta data
        if ($client_id && !is_wp_error($client_id)) {
            update_post_meta($client_id, '_client_email', $client_email);
            update_post_meta($client_id, '_client_phone', $client_phone);
            update_post_meta($client_id, '_client_nationality', $client_nationality);
            update_post_meta($client_id, '_client_sailing_experience', $client_experience);
        } else {
            error_log('Failed to create client: ' . (is_wp_error($client_id) ? $client_id->get_error_message() : 'Unknown error'));
            wp_send_json_error('Error creating client record. Please try again.');
            return;
        }
    }

    // Create booking inquiry
    if ($client_id && !is_wp_error($client_id)) {
        // Create booking post
        $booking_title = $client_name . ' - ' . $service_type . ' (' . $start_date . ')';
        $booking_id = wp_insert_post(array(
            'post_type' => 'booking',
            'post_title' => $booking_title,
            'post_content' => $message,
            'post_status' => 'publish'
        ));

        error_log('Creating new booking with result: ' . (is_wp_error($booking_id) ? $booking_id->get_error_message() : $booking_id));

        // Add booking meta data
        if ($booking_id && !is_wp_error($booking_id)) {
            update_post_meta($booking_id, '_booking_client_id', $client_id);
            update_post_meta($booking_id, '_booking_service_type', $service_type);
            update_post_meta($booking_id, '_booking_destination', $destination);
            update_post_meta($booking_id, '_booking_start_date', $start_date);
            update_post_meta($booking_id, '_booking_end_date', $end_date);
            update_post_meta($booking_id, '_booking_crew_size', $crew_size);
            update_post_meta($booking_id, '_booking_crew_services', $crew_services);
            update_post_meta($booking_id, '_booking_notes', $message);

            // Set booking status to 'inquiry'
            $term_result = wp_set_object_terms($booking_id, 'inquiry', 'booking_status');
            error_log('Setting booking status result: ' . print_r($term_result, true));

            // Send admin notification
            captain_send_inquiry_notification($booking_id);

            wp_send_json_success('Thank you for your inquiry. We will contact you shortly.');
        } else {
            error_log('Failed to create booking: ' . (is_wp_error($booking_id) ? $booking_id->get_error_message() : 'Unknown error'));
            wp_send_json_error('Error creating booking. Please try again.');
        }
    } else {
        wp_send_json_error('Error creating client record. Please try again.');
    }
}
add_action('wp_ajax_captain_process_booking_form', 'captain_process_booking_form');
add_action('wp_ajax_nopriv_captain_process_booking_form', 'captain_process_booking_form');

// Send admin notification for new inquiry
function captain_send_inquiry_notification($booking_id) {
    $admin_email = get_option('admin_email');
    $client_id = get_post_meta($booking_id, '_booking_client_id', true);

    $client_name = get_the_title($client_id);
    $client_email = get_post_meta($client_id, '_client_email', true);
    $client_phone = get_post_meta($client_id, '_client_phone', true);

    $service_type = get_post_meta($booking_id, '_booking_service_type', true);
    $service_types = array(
        'charter' => 'Private Charter',
        'flotilla' => 'Flotilla Leading',
        'instruction' => 'Sailing Instruction',
        'delivery' => 'Yacht Delivery'
    );
    $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;

    $start_date = get_post_meta($booking_id, '_booking_start_date', true);
    $formatted_date = date('F j, Y', strtotime($start_date));

    $subject = 'New Booking Inquiry: ' . $client_name . ' - ' . $service_display;

    $message = "A new booking inquiry has been submitted.\n\n";
    $message .= "Client: " . $client_name . "\n";
    $message .= "Email: " . $client_email . "\n";
    $message .= "Phone: " . $client_phone . "\n\n";
    $message .= "Service: " . $service_display . "\n";
    $message .= "Date: " . $formatted_date . "\n\n";
    $message .= "View details: " . admin_url('post.php?post=' . $booking_id . '&action=edit') . "\n";

    wp_mail($admin_email, $subject, $message);
}

// Handle calendar AJAX requests
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
            if (empty($start_date) || ($start && strtotime($start_date) < strtotime($start) && $end && strtotime($start_date) > strtotime($end))) {
                continue;
            }

            // Build the event object
            // Similar to your existing calendar code
            // ...
            $events[] = array(
                'id' => $booking_id,
                'title' => get_the_title(),
                'start' => $start_date,
                'end' => get_post_meta($booking_id, '_booking_end_date', true),
                'url' => admin_url('post.php?post=' . $booking_id . '&action=edit')
            );
        }
    }
    wp_reset_postdata();

    wp_send_json_success($events);
}
add_action('wp_ajax_captain_get_calendar_events', 'captain_get_calendar_events');