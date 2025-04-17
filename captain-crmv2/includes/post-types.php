<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}


// Modify in includes/post-types.php
function captain_register_crew_cpt() {
    $labels = array(
        'name'               => 'Crew',
        'singular_name'      => 'Crew Member',
        'menu_name'          => 'Crew',
        'name_admin_bar'     => 'Crew',
        'add_new'            => 'Add New',
        'add_new_item'       => 'Add New Crew Member',
        'new_item'           => 'New Crew Member',
        'edit_item'          => 'Edit Crew Member',
        'view_item'          => 'View Crew Member',
        'all_items'          => 'All Crew',
        'search_items'       => 'Search Crew',
        'parent_item_colon'  => 'Parent Crew Member:',
        'not_found'          => 'No crew members found.',
        'not_found_in_trash' => 'No crew members found in Trash.'
    );

    $args = array(
        'labels'              => $labels,
        'public'              => false,
        'publicly_queryable'  => false,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'menu_icon'           => 'dashicons-groups',
        'query_var'           => true,
        'rewrite'             => array('slug' => 'crew'),
        'capability_type'     => 'post',
        'has_archive'         => false,
        'hierarchical'        => false,
        'menu_position'       => 5,
        'supports'            => array('title', 'editor', 'custom-fields')
    );

    register_post_type('crew', $args);
}
add_action('init', 'captain_register_crew_cpt');

function captain_register_company_cpt() {
    $labels = array(
        'name'               => 'Companies',
        'singular_name'      => 'Company',
        'menu_name'          => 'Companies',
        'name_admin_bar'     => 'Companies',
        'add_new'            => 'Add New',
        'add_new_item'       => 'Add New Company',
        'new_item'           => 'New Company',
        'edit_item'          => 'Edit Company',
        'view_item'          => 'View Company',
        'all_items'          => 'All Companies',
        'search_items'       => 'Search Companies',
        'parent_item_colon'  => 'Parent Company:',
        'not_found'          => 'No companies found.',
        'not_found_in_trash' => 'No companies found in Trash.'
    );

    $args = array(
        'labels'              => $labels,
        'public'              => false,
        'publicly_queryable'  => false,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'menu_icon'           => 'dashicons-building',
        'query_var'           => true,
        'rewrite'             => array('slug' => 'company'),
        'capability_type'     => 'post',
        'has_archive'         => false,
        'hierarchical'        => false,
        'menu_position'       => 6,
        'supports'            => array('title', 'editor', 'custom-fields')
    );

    register_post_type('company', $args);
}
add_action('init', 'captain_register_company_cpt');


// Register Client Custom Post Type
function captain_register_client_cpt() {
    $labels = array(
        'name'               => 'Clients',
        'singular_name'      => 'Client',
        // Other labels from your original code
    );

    $args = array(
        'labels'              => $labels,
        'public'              => false,
        'publicly_queryable'  => false,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'menu_icon'           => 'dashicons-groups',
        'query_var'           => true,
        'rewrite'             => array('slug' => 'client'),
        'capability_type'     => 'post',
        'has_archive'         => false,
        'hierarchical'        => false,
        'menu_position'       => 5,
        'supports'            => array('title', 'editor', 'custom-fields')
    );

    register_post_type('client', $args);
}
add_action('init', 'captain_register_client_cpt');

// Register Booking Custom Post Type
function captain_register_booking_cpt() {
    $labels = array(
        'name'               => 'Bookings',
        'singular_name'      => 'Booking',
        // Other labels from your original code
    );

    $args = array(
        'labels'              => $labels,
        'public'              => false,
        'publicly_queryable'  => false,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'menu_icon'           => 'dashicons-calendar-alt',
        'query_var'           => true,
        'rewrite'             => array('slug' => 'booking'),
        'capability_type'     => 'post',
        'has_archive'         => false,
        'hierarchical'        => false,
        'menu_position'       => 6,
        'supports'            => array('title', 'editor', 'custom-fields')
    );

    register_post_type('booking', $args);
}
add_action('init', 'captain_register_booking_cpt');

// Register Booking Status Taxonomy
function captain_register_booking_status_taxonomy() {
    $labels = array(
        'name'              => 'Booking Statuses',
        'singular_name'     => 'Booking Status',
        // Other labels from your original code
    );

    $args = array(
        'hierarchical'      => true,
        'labels'            => $labels,
        'show_ui'           => true,
        'show_admin_column' => true,
        'query_var'         => true,
        'rewrite'           => array('slug' => 'booking-status')
    );

    register_taxonomy('booking_status', array('booking'), $args);
}
add_action('init', 'captain_register_booking_status_taxonomy');

// Add default booking statuses
function captain_add_default_booking_statuses() {
    $statuses = array(
        'inquiry' => 'Inquiry',
        'pending' => 'Pending',
        'confirmed' => 'Confirmed',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled'
    );

    foreach ($statuses as $slug => $name) {
        if (!term_exists($name, 'booking_status')) {
            wp_insert_term($name, 'booking_status', array('slug' => $slug));
        }
    }
}
add_action('init', 'captain_add_default_booking_statuses');