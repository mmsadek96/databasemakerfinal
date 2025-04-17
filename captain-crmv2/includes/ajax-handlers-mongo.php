<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Ajax handler for client bookings - MongoDB version
function captain_get_client_bookings_mongo($client_id, $status = 'all', $limit = 10, $offset = 0) {
    if (!class_exists('Captain_MongoDB_Integration')) {
        return false;
    }

    $mongodb = Captain_MongoDB_Integration::get_instance();
    if (!$mongodb || !$mongodb->is_enabled()) {
        return false;
    }

    try {
        return $mongodb->get_client_bookings($client_id, $status, $limit, $offset);
    } catch (Exception $e) {
        error_log('MongoDB Client Bookings Error: ' . $e->getMessage());
        return false;
    }
}

// Modified AJAX handler for client bookings with MongoDB support
function captain_get_client_bookings() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }

    $client_id = isset($_POST['client_id']) ? intval($_POST['client_id']) : 0;
    $status = isset($_POST['status']) ? sanitize_text_field($_POST['status']) : 'all';
    $page = isset($_POST['page']) ? intval($_POST['page']) : 1;
    $per_page = 10; // Number of bookings per page

    if (!$client_id) {
        wp_send_json_error('Invalid client ID');
        return;
    }

    // Try to get bookings from MongoDB first
    $mongo_bookings = captain_get_client_bookings_mongo($client_id, $status, $per_page, ($page - 1) * $per_page);

    ob_start();

    if ($mongo_bookings !== false) {
        // Using MongoDB results
        if (count($mongo_bookings) > 0) {
            echo '<div class="bookings-list">';
            foreach ($mongo_bookings as $booking) {
                // Get mongo data
                $booking_id = $booking['wordpress_id'];
                $service_type = $booking['service_type'];
                $start_date = $booking['start_date']->toDateTime()->format('Y-m-d');
                $destination = $booking['destination'];
                $status = $booking['status'];
                $payment_status = $booking['payment_status'];

                // Format data for display
                $service_types = array(
                    'charter' => 'Private Charter',
                    'flotilla' => 'Flotilla Leading',
                    'instruction' => 'Sailing Instruction',
                    'delivery' => 'Yacht Delivery'
                );

                $destinations = array(
                    'greece' => 'Greece',
                    'bvi' => 'British Virgin Islands',
                    'croatia' => 'Croatia',
                    'italy' => 'Italy',
                    'spain' => 'Spain',
                    'turkey' => 'Turkey',
                    'other' => 'Other'
                );

                $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;
                $destination_display = isset($destinations[$destination]) ? $destinations[$destination] : $destination;

                echo '<div class="booking-item">';
                echo '<h3>' . esc_html($service_display) . ' in ' . esc_html($destination_display) . '</h3>';
                echo '<p>Date: ' . date('F j, Y', strtotime($start_date)) . '</p>';
                echo '<p>Status: ' . esc_html(ucfirst($status)) . '</p>';

                // Show tip options for completed bookings
                $is_past = strtotime($start_date) < current_time('timestamp');
                $is_completed = $status === 'completed';
                $tip_paid = get_post_meta($booking_id, '_booking_tip_paid', true) === 'yes'; // Need to check WP for this

                if ($is_past && $is_completed && $payment_status === 'paid') {
                    if ($tip_paid) {
                        echo '<p class="tip-status success">Tip sent - Thank you!</p>';
                    } else {
                        $tip_requested = get_post_meta($booking_id, '_booking_tip_requested', true) === 'yes'; // Need to check WP

                        if ($tip_requested) {
                            $tip_token = get_post_meta($booking_id, '_booking_tip_token', true); // Need to check WP
                            $tip_link = site_url('tip-payment/?token=' . $tip_token);

                            echo '<p class="tip-status">Crew has requested a tip - <a href="' . esc_url($tip_link) . '" class="button tip-button">Leave a Tip</a></p>';
                        }
                    }
                }

                echo '<p><a href="?booking_id=' . esc_attr($booking_id) . '" class="button view-details">View Details</a></p>';
                echo '</div>';
            }
            echo '</div>';

            // Add pagination if needed
            if (count($mongo_bookings) >= $per_page) {
                echo '<div class="pagination">';
                echo '<button class="load-more-button" data-page="' . ($page + 1) . '" data-client="' . esc_attr($client_id) . '" data-status="' . esc_attr($status) . '">Load More</button>';
                echo '</div>';
            }
        } else {
            echo '<p>No bookings found.</p>';
        }
    } else {
        // Fall back to WordPress query
        // Build query args based on status
        $args = array(
            'post_type' => 'booking',
            'posts_per_page' => $per_page,
            'paged' => $page,
            'meta_key' => '_booking_client_id',
            'meta_value' => $client_id,
            'meta_compare' => '='
        );

        // Add date filtering if status is 'upcoming' or 'past'
        if ($status == 'upcoming' || $status == 'past') {
            $today = date('Y-m-d');
            $args['meta_query'] = array(
                array(
                    'key' => '_booking_start_date',
                    'value' => $today,
                    'compare' => $status == 'upcoming' ? '>=' : '<',
                    'type' => 'DATE'
                )
            );
        }

        $bookings = get_posts($args);

        if ($bookings) {
            echo '<div class="bookings-list">';
            foreach ($bookings as $booking) {
                $booking_id = $booking->ID;
                $service_type = get_post_meta($booking_id, '_booking_service_type', true);
                $start_date = get_post_meta($booking_id, '_booking_start_date', true);
                $destination = get_post_meta($booking_id, '_booking_destination', true);
                $booking_status = get_post_meta($booking_id, '_booking_status', true);
                $payment_status = get_post_meta($booking_id, '_booking_payment_status', true);

                // Get service type and destination labels
                $service_types = array(
                    'charter' => 'Private Charter',
                    'flotilla' => 'Flotilla Leading',
                    'instruction' => 'Sailing Instruction',
                    'delivery' => 'Yacht Delivery'
                );
                $destinations = array(
                    'greece' => 'Greece',
                    'bvi' => 'British Virgin Islands',
                    'croatia' => 'Croatia',
                    'italy' => 'Italy',
                    'spain' => 'Spain',
                    'turkey' => 'Turkey',
                    'other' => 'Other'
                );

                $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;
                $destination_display = isset($destinations[$destination]) ? $destinations[$destination] : $destination;

                // Get booking status
                $status_terms = get_the_terms($booking_id, 'booking_status');
                $status_display = $status_terms ? $status_terms[0]->name : ($booking_status ?: 'No status');

                echo '<div class="booking-item">';
                echo '<h3>' . esc_html($service_display) . ' in ' . esc_html($destination_display) . '</h3>';
                echo '<p>Date: ' . date('F j, Y', strtotime($start_date)) . '</p>';
                echo '<p>Status: ' . esc_html(ucfirst($status_display)) . '</p>';

                // Show tip options for completed bookings
                $is_past = strtotime($start_date) < current_time('timestamp');
                $is_completed = $booking_status === 'completed';
                $tip_paid = get_post_meta($booking_id, '_booking_tip_paid', true) === 'yes';

                if ($is_past && $is_completed && $payment_status === 'paid') {
                    if ($tip_paid) {
                        echo '<p class="tip-status success">Tip sent - Thank you!</p>';
                    } else {
                        $tip_requested = get_post_meta($booking_id, '_booking_tip_requested', true) === 'yes';

                        if ($tip_requested) {
                            $tip_token = get_post_meta($booking_id, '_booking_tip_token', true);
                            $tip_link = site_url('tip-payment/?token=' . $tip_token);

                            echo '<p class="tip-status">Crew has requested a tip - <a href="' . esc_url($tip_link) . '" class="button tip-button">Leave a Tip</a></p>';
                        }
                    }
                }

                echo '<p><a href="?booking_id=' . esc_attr($booking_id) . '" class="button view-details">View Details</a></p>';
                echo '</div>';
            }
            echo '</div>';

            // Add pagination if needed
            if (count($bookings) >= $per_page) {
                echo '<div class="pagination">';
                echo '<button class="load-more-button" data-page="' . ($page + 1) . '" data-client="' . esc_attr($client_id) . '" data-status="' . esc_attr($status) . '">Load More</button>';
                echo '</div>';
            }
        } else {
            echo '<p>No bookings found.</p>';
        }
    }

    $html = ob_get_clean();
    wp_send_json_success($html);
}
// Add action hooks for original and MongoDB version
remove_action('wp_ajax_captain_get_client_bookings', 'captain_get_client_bookings');
add_action('wp_ajax_captain_get_client_bookings', 'captain_get_client_bookings');