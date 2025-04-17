<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Add a shortcode to display a booking form on the front-end
function captain_booking_form_shortcode() {
    // Debugging: Log that shortcode is being called
    error_log('Captain CRM: Booking form shortcode called');

    // Get the booking form template
    ob_start();

    // Output direct message to verify shortcode is executing
    echo '<div class="captain-crm-form-wrapper">';

    // Check if template file exists
    $template_path = CAPTAIN_CRM_PLUGIN_DIR . 'templates/booking-form.php';
    if (file_exists($template_path)) {
        include $template_path;
    } else {
        // Output error if template doesn't exist
        echo '<p>Error: Booking form template not found.</p>';
        error_log('Captain CRM Error: Template not found at ' . $template_path);
    }

    echo '</div>';

    return ob_get_clean();
}

// Register shortcode on init to ensure WordPress is fully loaded
function captain_register_shortcodes() {
    add_shortcode('booking_form', 'captain_booking_form_shortcode');
}
add_action('init', 'captain_register_shortcodes');