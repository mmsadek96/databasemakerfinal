<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Custom Admin Columns for Clients
function captain_client_custom_columns($columns) {
    $new_columns = array();

    // Add existing columns we want to keep
    if (isset($columns['cb'])) {
        $new_columns['cb'] = $columns['cb'];
    }

    $new_columns['title'] = 'Client Name';
    $new_columns['email'] = 'Email';
    $new_columns['phone'] = 'Phone';
    $new_columns['nationality'] = 'Nationality';
    $new_columns['sailing_experience'] = 'Experience';
    $new_columns['bookings'] = 'Bookings';

    if (isset($columns['date'])) {
        $new_columns['date'] = $columns['date'];
    }

    return $new_columns;
}
add_filter('manage_client_posts_columns', 'captain_client_custom_columns');

// Custom Admin Column Content for Clients
function captain_client_custom_column_content($column, $post_id) {
    switch ($column) {
        case 'email':
            echo esc_html(get_post_meta($post_id, '_client_email', true));
            break;

        case 'phone':
            echo esc_html(get_post_meta($post_id, '_client_phone', true));
            break;

        case 'nationality':
            echo esc_html(get_post_meta($post_id, '_client_nationality', true));
            break;

        case 'sailing_experience':
            $experience = get_post_meta($post_id, '_client_sailing_experience', true);
            $experience_labels = array(
                'none' => 'None',
                'beginner' => 'Beginner',
                'intermediate' => 'Intermediate',
                'advanced' => 'Advanced',
                'expert' => 'Expert'
            );
            echo isset($experience_labels[$experience]) ? esc_html($experience_labels[$experience]) : '';
            break;

        case 'bookings':
            // Count bookings for this client
            $bookings = get_posts(array(
                'post_type' => 'booking',
                'posts_per_page' => -1,
                'meta_query' => array(
                    array(
                        'key' => '_booking_client_id',
                        'value' => $post_id
                    )
                )
            ));

            $count = count($bookings);
            if ($count > 0) {
                $url = admin_url('edit.php?post_type=booking&meta_key=_booking_client_id&meta_value=' . $post_id);
                echo '<a href="' . esc_url($url) . '">' . $count . '</a>';
            } else {
                echo '0';
            }
            break;
    }
}
add_action('manage_client_posts_custom_column', 'captain_client_custom_column_content', 10, 2);

// Custom Admin Columns for Bookings
function captain_booking_custom_columns($columns) {
    $new_columns = array();

    // Add existing columns we want to keep
    if (isset($columns['cb'])) {
        $new_columns['cb'] = $columns['cb'];
    }

    $new_columns['title'] = 'Booking Title';
    $new_columns['client'] = 'Client';
    $new_columns['dates'] = 'Dates';
    $new_columns['service'] = 'Service';
    $new_columns['destination'] = 'Destination';
    $new_columns['crew_services'] = 'Crew Services';
    $new_columns['price'] = 'Price';
    $new_columns['booking_status'] = 'Status';

    if (isset($columns['date'])) {
        $new_columns['date'] = 'Created';
    }

    return $new_columns;
}
add_filter('manage_booking_posts_columns', 'captain_booking_custom_columns');

// Custom Admin Column Content for Bookings
function captain_booking_custom_column_content($column, $post_id) {
    switch ($column) {
        case 'client':
            $client_id = get_post_meta($post_id, '_booking_client_id', true);
            if ($client_id) {
                echo '<a href="' . get_edit_post_link($client_id) . '">' . get_the_title($client_id) . '</a>';
            } else {
                echo 'No client selected';
            }
            break;

        case 'dates':
            $start_date = get_post_meta($post_id, '_booking_start_date', true);
            $end_date = get_post_meta($post_id, '_booking_end_date', true);

            if ($start_date) {
                echo date('M j, Y', strtotime($start_date));

                if ($end_date) {
                    echo ' - ' . date('M j, Y', strtotime($end_date));
                }
            }
            break;

        case 'service':
            $service_type = get_post_meta($post_id, '_booking_service_type', true);
            $service_types = array(
                'charter' => 'Private Charter',
                'flotilla' => 'Flotilla Leading',
                'instruction' => 'Sailing Instruction',
                'delivery' => 'Yacht Delivery'
            );
            echo isset($service_types[$service_type]) ? esc_html($service_types[$service_type]) : '';
            break;

        case 'crew_services':
            $crew_services = get_post_meta($post_id, '_booking_crew_services', true);
            $services_labels = array(
                'captain' => 'Captain Only',
                'chef' => 'Chef Only',
                'both' => 'Captain and Chef',
                'none' => 'No Crew Services'
            );
            echo isset($services_labels[$crew_services]) ? esc_html($services_labels[$crew_services]) : '';
            break;

        case 'destination':
            $destination = get_post_meta($post_id, '_booking_destination', true);
            $destinations = array(
                'greece' => 'Greece',
                'bvi' => 'British Virgin Islands',
                'other' => 'Other'
            );
            echo isset($destinations[$destination]) ? esc_html($destinations[$destination]) : '';
            break;

        case 'price':
            $price = get_post_meta($post_id, '_booking_price', true);
            echo $price ? '€' . esc_html($price) : '';
            break;
    }
}
add_action('manage_booking_posts_custom_column', 'captain_booking_custom_column_content', 10, 2);

// Make columns sortable
function captain_sortable_columns($columns) {
    $columns['client'] = 'client';
    $columns['dates'] = '_booking_start_date';
    $columns['service'] = '_booking_service_type';
    $columns['destination'] = '_booking_destination';
    $columns['price'] = '_booking_price';

    return $columns;
}
add_filter('manage_edit-booking_sortable_columns', 'captain_sortable_columns');

// Modify query for sorting
function captain_booking_orderby($query) {
    if (!is_admin() || !$query->is_main_query()) {
        return;
    }

    if ($query->get('post_type') !== 'booking') {
        return;
    }

    $orderby = $query->get('orderby');

    if ('client' === $orderby) {
        $query->set('meta_key', '_booking_client_id');
        $query->set('orderby', 'meta_value_num');
    }
}
add_action('pre_get_posts', 'captain_booking_orderby');