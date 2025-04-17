<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Client Meta Boxes
function captain_add_client_meta_boxes() {
    add_meta_box(
        'client_details_metabox',
        'Client Details',
        'captain_client_details_callback',
        'client',
        'normal',
        'high'
    );

    add_meta_box(
        'client_notes_metabox',
        'Client Notes',
        'captain_client_notes_callback',
        'client',
        'normal',
        'default'
    );
}
add_action('add_meta_boxes', 'captain_add_client_meta_boxes');

// Client Details Callback
function captain_client_details_callback($post) {
    wp_nonce_field('captain_client_details_nonce', 'captain_client_details_nonce');

    $email = get_post_meta($post->ID, '_client_email', true);
    $phone = get_post_meta($post->ID, '_client_phone', true);
    $address = get_post_meta($post->ID, '_client_address', true);
    $nationality = get_post_meta($post->ID, '_client_nationality', true);
    $sailing_experience = get_post_meta($post->ID, '_client_sailing_experience', true);
    $certifications = get_post_meta($post->ID, '_client_certifications', true);

    echo '<table class="form-table">
        <tr>
            <th><label for="client_email">Email</label></th>
            <td><input type="email" id="client_email" name="client_email" value="' . esc_attr($email) . '" class="regular-text"></td>
        </tr>
        <tr>
            <th><label for="client_phone">Phone</label></th>
            <td><input type="text" id="client_phone" name="client_phone" value="' . esc_attr($phone) . '" class="regular-text"></td>
        </tr>
        <tr>
            <th><label for="client_address">Address</label></th>
            <td><textarea id="client_address" name="client_address" rows="3" class="large-text">' . esc_textarea($address) . '</textarea></td>
        </tr>
        <tr>
            <th><label for="client_nationality">Nationality</label></th>
            <td><input type="text" id="client_nationality" name="client_nationality" value="' . esc_attr($nationality) . '" class="regular-text"></td>
        </tr>
        <tr>
            <th><label for="client_sailing_experience">Sailing Experience</label></th>
            <td>
                <select id="client_sailing_experience" name="client_sailing_experience">
                    <option value="" ' . selected($sailing_experience, '', false) . '>Select Experience Level</option>
                    <option value="none" ' . selected($sailing_experience, 'none', false) . '>None</option>
                    <option value="beginner" ' . selected($sailing_experience, 'beginner', false) . '>Beginner</option>
                    <option value="intermediate" ' . selected($sailing_experience, 'intermediate', false) . '>Intermediate</option>
                    <option value="advanced" ' . selected($sailing_experience, 'advanced', false) . '>Advanced</option>
                    <option value="expert" ' . selected($sailing_experience, 'expert', false) . '>Expert</option>
                </select>
            </td>
        </tr>
        <tr>
            <th><label for="client_certifications">Certifications</label></th>
            <td><textarea id="client_certifications" name="client_certifications" rows="3" class="large-text">' . esc_textarea($certifications) . '</textarea></td>
        </tr>
    </table>';
}

// Client Notes Callback
function captain_client_notes_callback($post) {
    $notes = get_post_meta($post->ID, '_client_notes', true);
    echo '<textarea id="client_notes" name="client_notes" rows="5" class="large-text">' . esc_textarea($notes) . '</textarea>';
    echo '<p class="description">Add private notes about this client (preferences, special requirements, etc.)</p>';
}

// Save Client Meta
function captain_save_client_meta($post_id) {
    // Check if nonce is set
    if (!isset($_POST['captain_client_details_nonce'])) {
        return;
    }

    // Verify nonce
    if (!wp_verify_nonce($_POST['captain_client_details_nonce'], 'captain_client_details_nonce')) {
        return;
    }

    // Check if autosave
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }

    // Check permissions
    if ('client' === $_POST['post_type'] && !current_user_can('edit_post', $post_id)) {
        return;
    }

    // Save client data
    if (isset($_POST['client_email'])) {
        update_post_meta($post_id, '_client_email', sanitize_email($_POST['client_email']));
    }

    if (isset($_POST['client_phone'])) {
        update_post_meta($post_id, '_client_phone', sanitize_text_field($_POST['client_phone']));
    }

    if (isset($_POST['client_address'])) {
        update_post_meta($post_id, '_client_address', sanitize_textarea_field($_POST['client_address']));
    }

    if (isset($_POST['client_nationality'])) {
        update_post_meta($post_id, '_client_nationality', sanitize_text_field($_POST['client_nationality']));
    }

    if (isset($_POST['client_sailing_experience'])) {
        update_post_meta($post_id, '_client_sailing_experience', sanitize_text_field($_POST['client_sailing_experience']));
    }

    if (isset($_POST['client_certifications'])) {
        update_post_meta($post_id, '_client_certifications', sanitize_textarea_field($_POST['client_certifications']));
    }

    if (isset($_POST['client_notes'])) {
        update_post_meta($post_id, '_client_notes', sanitize_textarea_field($_POST['client_notes']));
    }
}
add_action('save_post', 'captain_save_client_meta');

// Booking Meta Boxes
function captain_add_booking_meta_boxes() {
    add_meta_box(
        'booking_details_metabox',
        'Booking Details',
        'captain_booking_details_callback',
        'booking',
        'normal',
        'high'
    );

    add_meta_box(
        'booking_client_metabox',
        'Client Information',
        'captain_booking_client_callback',
        'booking',
        'side',
        'default'
    );
}
add_action('add_meta_boxes', 'captain_add_booking_meta_boxes');

// Booking Details Callback
function captain_booking_details_callback($post) {
    wp_nonce_field('captain_booking_details_nonce', 'captain_booking_details_nonce');

    $start_date = get_post_meta($post->ID, '_booking_start_date', true);
    $end_date = get_post_meta($post->ID, '_booking_end_date', true);
    $service_type = get_post_meta($post->ID, '_booking_service_type', true);
    $destination = get_post_meta($post->ID, '_booking_destination', true);
    $crew_size = get_post_meta($post->ID, '_booking_crew_size', true);
    $crew_services = get_post_meta($post->ID, '_booking_crew_services', true);
    $price = get_post_meta($post->ID, '_booking_price', true);
    $notes = get_post_meta($post->ID, '_booking_notes', true);

    echo '<table class="form-table">
        <tr>
            <th><label for="booking_start_date">Start Date</label></th>
            <td><input type="date" id="booking_start_date" name="booking_start_date" value="' . esc_attr($start_date) . '" class="regular-text"></td>
        </tr>
        <tr>
            <th><label for="booking_end_date">End Date</label></th>
            <td><input type="date" id="booking_end_date" name="booking_end_date" value="' . esc_attr($end_date) . '" class="regular-text"></td>
        </tr>
        <tr>
            <th><label for="booking_service_type">Service Type</label></th>
            <td>
                <select id="booking_service_type" name="booking_service_type">
                    <option value="" ' . selected($service_type, '', false) . '>Select Service</option>
                    <option value="charter" ' . selected($service_type, 'charter', false) . '>Private Charter</option>
                    <option value="flotilla" ' . selected($service_type, 'flotilla', false) . '>Flotilla Leading</option>
                    <option value="instruction" ' . selected($service_type, 'instruction', false) . '>Sailing Instruction</option>
                    <option value="delivery" ' . selected($service_type, 'delivery', false) . '>Yacht Delivery</option>
                </select>
            </td>
        </tr>
        <tr>
            <th><label for="booking_destination">Destination</label></th>
            <td>
                <select id="booking_destination" name="booking_destination">
                    <option value="" ' . selected($destination, '', false) . '>Select Destination</option>
                    <option value="greece" ' . selected($destination, 'greece', false) . '>Greece</option>
                    <option value="bvi" ' . selected($destination, 'bvi', false) . '>British Virgin Islands</option>
                    <option value="other" ' . selected($destination, 'other', false) . '>Other</option>
                </select>
            </td>
        </tr>

        <tr>
            <th><label for="booking_crew_services">Crew Services</label></th>
            <td>
                 <select id="booking_crew_services" name="booking_crew_services">
                    <option value="" ' . selected($crew_services, '', false) . '>Select Services</option>
                    <option value="captain" ' . selected($crew_services, 'captain', false) . '>Captain Only</option>
                    <option value="chef" ' . selected($crew_services, 'chef', false) . '>Chef Only</option>
                    <option value="both" ' . selected($crew_services, 'both', false) . '>Both Captain and Chef</option>
                    <option value="none" ' . selected($crew_services, 'none', false) . '>No Crew Services</option>
                 </select>
            </td>
        </tr>

        <tr>
            <th><label for="booking_crew_size">Crew Size</label></th>
            <td><input type="number" id="booking_crew_size" name="booking_crew_size" value="' . esc_attr($crew_size) . '" class="small-text" min="1"></td>
        </tr>
        <tr>
            <th><label for="booking_price">Price</label></th>
            <td><input type="text" id="booking_price" name="booking_price" value="' . esc_attr($price) . '" class="regular-text"></td>
        </tr>
        <tr>
            <th><label for="booking_notes">Notes</label></th>
            <td><textarea id="booking_notes" name="booking_notes" rows="5" class="large-text">' . esc_textarea($notes) . '</textarea></td>
        </tr>
    </table>';
}

// Booking Client Callback
function captain_booking_client_callback($post) {
    $client_id = get_post_meta($post->ID, '_booking_client_id', true);

    // Get all clients
    $clients = get_posts(array(
        'post_type' => 'client',
        'posts_per_page' => -1,
        'orderby' => 'title',
        'order' => 'ASC'
    ));

    echo '<select id="booking_client_id" name="booking_client_id" class="widefat">';
    echo '<option value="">Select Client</option>';

    foreach ($clients as $client) {
        echo '<option value="' . esc_attr($client->ID) . '" ' . selected($client_id, $client->ID, false) . '>' . esc_html($client->post_title) . '</option>';
    }

    echo '</select>';
    echo '<p><a href="' . admin_url('post-new.php?post_type=client') . '" target="_blank">Add New Client</a></p>';

    // If client is selected, show quick info
    if ($client_id) {
        $email = get_post_meta($client_id, '_client_email', true);
        $phone = get_post_meta($client_id, '_client_phone', true);

        echo '<div class="client-info" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">';
        echo '<p><strong>Email:</strong> ' . esc_html($email) . '</p>';
        echo '<p><strong>Phone:</strong> ' . esc_html($phone) . '</p>';
        echo '<p><a href="' . get_edit_post_link($client_id) . '" target="_blank">Edit Client</a></p>';
        echo '</div>';
    }
}

// Save Booking Meta
function captain_save_booking_meta($post_id) {
    // Check if nonce is set
    if (!isset($_POST['captain_booking_details_nonce'])) {
        return;
    }

    // Verify nonce
    if (!wp_verify_nonce($_POST['captain_booking_details_nonce'], 'captain_booking_details_nonce')) {
        return;
    }

    // Check if autosave
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }

    // Check permissions
    if ('booking' === $_POST['post_type'] && !current_user_can('edit_post', $post_id)) {
        return;
    }

    // Save booking data
    if (isset($_POST['booking_start_date'])) {
        update_post_meta($post_id, '_booking_start_date', sanitize_text_field($_POST['booking_start_date']));
    }

    if (isset($_POST['booking_end_date'])) {
        update_post_meta($post_id, '_booking_end_date', sanitize_text_field($_POST['booking_end_date']));
    }

    if (isset($_POST['booking_service_type'])) {
        update_post_meta($post_id, '_booking_service_type', sanitize_text_field($_POST['booking_service_type']));
    }

    if (isset($_POST['booking_destination'])) {
        update_post_meta($post_id, '_booking_destination', sanitize_text_field($_POST['booking_destination']));
    }

    if (isset($_POST['booking_crew_size'])) {
        update_post_meta($post_id, '_booking_crew_size', intval($_POST['booking_crew_size']));
    }

    if (isset($_POST['booking_crew_services'])) {
        update_post_meta($post_id, '_booking_crew_services', sanitize_text_field($_POST['booking_crew_services']));
    }

    if (isset($_POST['booking_price'])) {
        update_post_meta($post_id, '_booking_price', sanitize_text_field($_POST['booking_price']));
    }

    if (isset($_POST['booking_notes'])) {
        update_post_meta($post_id, '_booking_notes', sanitize_textarea_field($_POST['booking_notes']));
    }

    if (isset($_POST['booking_client_id'])) {
        update_post_meta($post_id, '_booking_client_id', intval($_POST['booking_client_id']));
    }
}
add_action('save_post', 'captain_save_booking_meta');