<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * MongoDB Main Integration
 *
 * This file loads all MongoDB integrations for the Captain CRM plugin
 */

// Include MongoDB integration class
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/mongodb-integration.php';

// Include MongoDB-specific components
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/ajax-handlers-mongo.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/calendar-mongo.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/settings-mongo.php';
require_once CAPTAIN_CRM_PLUGIN_DIR . 'includes/migration-tool.php';

/**
 * Initialize MongoDB integration
 *
 * @return Captain_MongoDB_Integration|null
 */
function captain_mongodb_init() {
    // Only initialize if MongoDB is enabled
    if (get_option('captain_mongodb_enabled', '0') === '1') {
        return Captain_MongoDB_Integration::get_instance();
    }
    return null;
}

/**
 * Replace standard function with MongoDB version if available
 */
function captain_replace_wp_functions_with_mongo() {
    // Only proceed if MongoDB is enabled
    if (get_option('captain_mongodb_enabled', '0') !== '1') {
        return;
    }

    $mongodb = Captain_MongoDB_Integration::get_instance();
    if (!$mongodb || !$mongodb->is_enabled()) {
        return;
    }

    // Replace calendar functions
    remove_action('wp_ajax_captain_get_calendar_events', 'captain_get_calendar_events');
    add_action('wp_ajax_captain_get_calendar_events', 'captain_get_calendar_events');

    // Reports are handled internally with fallbacks
}
add_action('init', 'captain_replace_wp_functions_with_mongo', 20);

/**
 * Enqueue MongoDB-specific scripts
 */
function captain_enqueue_mongodb_scripts() {
    // Only proceed if MongoDB is enabled
    if (get_option('captain_mongodb_enabled', '0') !== '1') {
        return;
    }

    if (is_page(get_option('captain_client_dashboard_page')) ||
        is_page(get_option('captain_employee_dashboard_page'))) {

        // Replace standard dashboard.js with MongoDB version
        wp_dequeue_script('captain-dashboard');
        wp_enqueue_script(
            'captain-dashboard-mongo',
            CAPTAIN_CRM_PLUGIN_URL . 'assets/js/dashboard-mongo.js',
            array('jquery'),
            CAPTAIN_CRM_VERSION,
            true
        );

        // Ensure AJAX variables are still passed
        wp_localize_script(
            'captain-dashboard-mongo',
            'captain_ajax',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('captain_ajax_nonce')
            )
        );
    }
}
add_action('wp_enqueue_scripts', 'captain_enqueue_mongodb_scripts', 20);

/**
 * Add status indicator for MongoDB in admin bar
 */
function captain_mongodb_admin_bar($admin_bar) {
    if (!current_user_can('manage_options')) {
        return;
    }

    $mongodb_enabled = get_option('captain_mongodb_enabled', '0') === '1';
    $mongodb_working = false;

    if ($mongodb_enabled) {
        $mongodb = Captain_MongoDB_Integration::get_instance();
        $mongodb_working = $mongodb && $mongodb->is_enabled();
    }

    $admin_bar->add_node(array(
        'id'    => 'captain-mongodb',
        'title' => 'MongoDB: ' . ($mongodb_working ?
                              '<span style="color: #4CAF50;">●</span> Active' :
                              ($mongodb_enabled ?
                               '<span style="color: #ff9800;">●</span> Error' :
                               '<span style="color: #F44336;">●</span> Disabled')),
        'href'  => admin_url('admin.php?page=captain-settings'),
        'meta'  => array(
            'title' => 'Captain CRM MongoDB Status'
        )
    ));
}
add_action('admin_bar_menu', 'captain_mongodb_admin_bar', 100);

/**
 * Periodically sync changes to MongoDB
 *
 * This function syncs any recently updated posts to MongoDB
 */
function captain_sync_recent_changes_to_mongodb() {
    // Only proceed if MongoDB is enabled
    if (get_option('captain_mongodb_enabled', '0') !== '1') {
        return;
    }

    $mongodb = Captain_MongoDB_Integration::get_instance();
    if (!$mongodb || !$mongodb->is_enabled()) {
        return;
    }

    // Get recently updated clients (last 15 minutes)
    $recent_clients = get_posts(array(
        'post_type' => 'client',
        'posts_per_page' => 10,
        'post_status' => 'publish',
        'date_query' => array(
            'column' => 'post_modified',
            'after' => '15 minutes ago'
        )
    ));

    foreach ($recent_clients as $client) {
        $mongodb->sync_client_to_mongodb($client->ID, $client, true);
    }

    // Get recently updated bookings (last 15 minutes)
    $recent_bookings = get_posts(array(
        'post_type' => 'booking',
        'posts_per_page' => 10,
        'post_status' => 'publish',
        'date_query' => array(
            'column' => 'post_modified',
            'after' => '15 minutes ago'
        )
    ));

    foreach ($recent_bookings as $booking) {
        $mongodb->sync_booking_to_mongodb($booking->ID, $booking, true);
    }
}
add_action('wp_scheduled_auto_update_plugins', 'captain_sync_recent_changes_to_mongodb');