<?php
/**
 * Plugin Name: Captain CRM
 * Description: Custom CRM solution for yacht captain business
 * Version: 1.1
 * Author: Your Name
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('CAPTAIN_CRM_VERSION', '1.1');
define('CAPTAIN_CRM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CAPTAIN_CRM_PLUGIN_URL', plugin_dir_url(__FILE__));

// Autoload dependencies if Composer is used
if (file_exists(CAPTAIN_CRM_PLUGIN_DIR . 'vendor/autoload.php')) {
    require_once CAPTAIN_CRM_PLUGIN_DIR . 'vendor/autoload.php';
}

// Include basic files
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/post-types.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/meta-boxes.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/admin-columns.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/shortcodes.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/ajax-handlers.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/dashboard-widgets.php';

// Include MongoDB integration
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/mongodb-integration.php';

// Include advanced features
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/contract-generator.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/payment-manager.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/user-dashboard.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/reports.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/settings.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/calendar.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/invoices.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/rating-system.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/tip-system.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/employee-management.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/document-manager.php';

// Enqueue scripts and styles
function captain_enqueue_scripts() {
    // Frontend scripts and styles
    if (is_page() || is_single()) {
        wp_enqueue_style(
            'captain-booking-form',
            CAPTAIN_CRM_PLUGIN_URL . 'assets/css/booking-form.css',
            array(),
            CAPTAIN_CRM_VERSION
        );

        wp_enqueue_script(
            'captain-booking-form',
            CAPTAIN_CRM_PLUGIN_URL . 'assets/js/booking-form.js',
            array('jquery'),
            CAPTAIN_CRM_VERSION,
            true
        );

        // Pass AJAX URL and nonce to booking form script
        wp_localize_script(
            'captain-booking-form',
            'captain_ajax',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('captain_ajax_nonce')
            )
        );

        // Add dashboard styles and scripts if on dashboard pages
        if (is_page(get_option('captain_client_dashboard_page')) ||
            is_page(get_option('captain_employee_dashboard_page'))) {

            wp_enqueue_style(
                'captain-dashboard',
                CAPTAIN_CRM_PLUGIN_URL . 'assets/css/dashboard.css',
                array(),
                CAPTAIN_CRM_VERSION
            );

            wp_enqueue_script(
                'captain-dashboard',
                CAPTAIN_CRM_PLUGIN_URL . 'assets/js/dashboard.js',
                array('jquery'),
                CAPTAIN_CRM_VERSION,
                true
            );

            // Pass AJAX URL and nonce to dashboard script
            wp_localize_script(
                'captain-dashboard',
                'captain_ajax',
                array(
                    'ajax_url' => admin_url('admin-ajax.php'),
                    'nonce' => wp_create_nonce('captain_ajax_nonce')
                )
            );
        }
    }
}
add_action('wp_enqueue_scripts', 'captain_enqueue_scripts');

// Enqueue admin scripts and styles
function captain_enqueue_admin_scripts($hook) {
    // Admin scripts and styles
    wp_enqueue_style(
        'captain-admin',
        CAPTAIN_CRM_PLUGIN_URL . 'assets/css/admin.css',
        array(),
        CAPTAIN_CRM_VERSION
    );

    // Only load calendar scripts on calendar page
    if ('booking_page_captain-calendar' === $hook) {
        wp_enqueue_style('fullcalendar', 'https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.css');
        wp_enqueue_script('fullcalendar', 'https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.js', array(), '5.10.1', true);
        wp_enqueue_script(
            'captain-calendar',
            CAPTAIN_CRM_PLUGIN_URL . 'assets/js/calendar.js',
            array('fullcalendar', 'jquery'),
            CAPTAIN_CRM_VERSION,
            true
        );

        wp_localize_script('captain-calendar', 'captainCalendar', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('captain_calendar_nonce')
        ));
    }

    // Admin scripts for contract generation and payment management
    if ('post.php' === $hook || 'post-new.php' === $hook) {
        $screen = get_current_screen();
        if (is_object($screen) && 'booking' === $screen->post_type) {
            wp_enqueue_script(
                'captain-admin-booking',
                CAPTAIN_CRM_PLUGIN_URL . 'assets/js/admin-booking.js',
                array('jquery'),
                CAPTAIN_CRM_VERSION,
                true
            );

            wp_localize_script('captain-admin-booking', 'captainAdmin', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('captain_admin_nonce')
            ));
        }
    }
}
add_action('admin_enqueue_scripts', 'captain_enqueue_admin_scripts');

// Register activation and deactivation hooks
register_activation_hook(__FILE__, 'captain_activate_plugin');
register_deactivation_hook(__FILE__, 'captain_deactivate_plugin');

// Activation function
function captain_activate_plugin() {
    // Create custom post types
    if (function_exists('captain_register_client_cpt')) {
        captain_register_client_cpt();
    }
    if (function_exists('captain_register_booking_cpt')) {
        captain_register_booking_cpt();
    }
    if (function_exists('captain_register_employee_cpt')) {
        captain_register_employee_cpt();
    }

    // Create required options with default values
    add_option('captain_company_name', 'Malek Msadek - Yacht Captain Services');
    add_option('captain_company_address', 'Your Business Address');
    add_option('captain_company_email', get_option('admin_email'));
    add_option('captain_company_phone', 'Your Phone Number');

    // Add dashboard page options
    add_option('captain_client_dashboard_page', '');
    add_option('captain_employee_dashboard_page', '');

    // Add options for advanced features
    add_option('captain_ai_provider', 'openai');
    add_option('captain_ai_api_key', '');
    add_option('captain_gemini_api_key', '');
    add_option('captain_payment_escrow_fee', '3.5'); // Percentage fee for payment escrow service

    // MongoDB options
    add_option('captain_mongodb_enabled', '0');
    add_option('captain_mongodb_uri', 'mongodb://localhost:27017');
    add_option('captain_mongodb_name', 'captain_crm');

    // Create the tip payment page
    if (get_page_by_path('tip-payment') === null) {
        $tip_page = array(
            'post_title'    => 'Tip Payment',
            'post_content'  => '[captain_tip_payment]',
            'post_status'   => 'publish',
            'post_type'     => 'page',
            'post_name'     => 'tip-payment'
        );
        wp_insert_post($tip_page);
    }

    // Flush rewrite rules
    flush_rewrite_rules();

    // Initialize MongoDB and create indexes if enabled
    if (get_option('captain_mongodb_enabled', '0') === '1') {
        $mongodb = Captain_MongoDB_Integration::get_instance();
        if ($mongodb->is_enabled()) {
            $mongodb->create_indexes();
        }
    }
}

// Deactivation function
function captain_deactivate_plugin() {
    // Flush rewrite rules
    flush_rewrite_rules();
}

// Add settings link on plugin page
function captain_add_settings_link($links) {
    $settings_link = '<a href="admin.php?page=captain-settings">Settings</a>';
    array_unshift($links, $settings_link);
    return $links;
}
$plugin_file = plugin_basename(__FILE__);
add_filter("plugin_action_links_$plugin_file", 'captain_add_settings_link');

// MongoDB sync tool
function captain_mongodb_sync_data() {
    // Only run if MongoDB is enabled and admin requested sync
    if (isset($_GET['mongodb_sync']) && $_GET['mongodb_sync'] === '1' && current_user_can('manage_options')) {
        $mongodb = Captain_MongoDB_Integration::get_instance();
        if ($mongodb && $mongodb->is_enabled()) {
            $result = $mongodb->sync_all_data();
            if ($result) {
                add_action('admin_notices', function() {
                    echo '<div class="notice notice-success"><p>All data has been successfully synchronized to MongoDB.</p></div>';
                });
            } else {
                add_action('admin_notices', function() {
                    echo '<div class="notice notice-error"><p>There was an error synchronizing data to MongoDB. Check the error log for details.</p></div>';
                });
            }
        }
    }
}
add_action('admin_init', 'captain_mongodb_sync_data');

/**
 * Handle document download requests
 */
function captain_handle_document_download() {
    if (!isset($_GET['action']) || $_GET['action'] !== 'captain_download_document') {
        return;
    }

    // Check if required parameters are set
    if (!isset($_GET['employee']) || !isset($_GET['document']) || !isset($_GET['nonce'])) {
        wp_die('Invalid request');
    }

    // Verify nonce
    $employee_id = intval($_GET['employee']);
    $document_index = intval($_GET['document']);

    if (!wp_verify_nonce($_GET['nonce'], 'download_document_' . $employee_id . '_' . $document_index)) {
        wp_die('Security check failed');
    }

    // Check if user is logged in
    if (!is_user_logged_in()) {
        wp_die('You must be logged in to download documents');
    }

    // Check permissions
    $current_user = wp_get_current_user();
    $employee_email = get_post_meta($employee_id, '_employee_email', true);
    $employer_id = get_post_meta($employee_id, '_employee_employer_id', true);

    // Check if user is the employee, employer, or admin
    if (!current_user_can('manage_options') &&
        $current_user->user_email != $employee_email &&
        $current_user->ID != $employer_id) {
        wp_die('You do not have permission to download this document');
    }

    // Get documents
    $documents = get_post_meta($employee_id, '_employee_documents', true);
    if (!is_array($documents) || !isset($documents[$document_index])) {
        wp_die('Document not found');
    }

    $document = $documents[$document_index];

    // Get file path
    $upload_dir = wp_upload_dir();
    $file_path = $upload_dir['basedir'] . '/captain-crm/employee-' . $employee_id . '/' . $document['filename'];

    if (!file_exists($file_path)) {
        wp_die('File not found');
    }

    // Set headers and serve file
    header('Content-Description: File Transfer');
    header('Content-Type: ' . $document['file_type']);
    header('Content-Disposition: attachment; filename="' . $document['original_name'] . '"');
    header('Expires: 0');
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    header('Content-Length: ' . filesize($file_path));
    readfile($file_path);
    exit;
}
add_action('init', 'captain_handle_document_download');