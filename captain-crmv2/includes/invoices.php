<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Add metabox for invoice generation
function captain_add_invoice_metabox() {
    add_meta_box(
        'booking_invoice_metabox',
        'Invoice',
        'captain_booking_invoice_callback',
        'booking',
        'side',
        'default'
    );
}
add_action('add_meta_boxes', 'captain_add_invoice_metabox');

// Invoice metabox callback
function captain_booking_invoice_callback($post) {
    $invoice_number = get_post_meta($post->ID, '_booking_invoice_number', true);
    $invoice_date = get_post_meta($post->ID, '_booking_invoice_date', true);
    $invoice_status = get_post_meta($post->ID, '_booking_invoice_status', true);

    echo '<div class="invoice-actions">';

    if (!empty($invoice_number)) {
        echo '<p><strong>Invoice #:</strong> ' . esc_html($invoice_number) . '</p>';
        echo '<p><strong>Date:</strong> ' . esc_html($invoice_date) . '</p>';
        echo '<p><strong>Status:</strong> ' . esc_html($invoice_status) . '</p>';

        echo '<p><a href="' . admin_url('admin.php?page=captain-generate-invoice&booking_id=' . $post->ID) . '" class="button" target="_blank">View Invoice</a></p>';

        if ($invoice_status !== 'Paid') {
            echo '<p><a href="' . admin_url('admin-post.php?action=captain_mark_invoice_paid&booking_id=' . $post->ID . '&_wpnonce=' . wp_create_nonce('mark_invoice_paid')) . '" class="button">Mark as Paid</a></p>';
        }
    } else {
        echo '<p>No invoice has been generated yet.</p>';
        echo '<p><a href="' . admin_url('admin-post.php?action=captain_generate_invoice&booking_id=' . $post->ID . '&_wpnonce=' . wp_create_nonce('generate_invoice')) . '" class="button">Generate Invoice</a></p>';
    }

    echo '</div>';
}

// Add invoice page
function captain_add_invoice_page() {
    add_submenu_page(
        null, // No parent menu
        'Generate Invoice',
        'Generate Invoice',
        'manage_options',
        'captain-generate-invoice',
        'captain_generate_invoice_page_callback'
    );
}
add_action('admin_menu', 'captain_add_invoice_page');

// Generate invoice action
function captain_generate_invoice_action() {
    // Check permissions and nonce
    if (!current_user_can('manage_options') || !isset($_GET['booking_id']) || !isset($_GET['_wpnonce']) || !wp_verify_nonce($_GET['_wpnonce'], 'generate_invoice')) {
        wp_die('Unauthorized access');
    }

    $booking_id = intval($_GET['booking_id']);

    // Check if booking exists
    $booking = get_post($booking_id);
    if (!$booking || $booking->post_type !== 'booking') {
        wp_die('Invalid booking');
    }

    // Generate invoice number if not exists
    $invoice_number = get_post_meta($booking_id, '_booking_invoice_number', true);

    if (empty($invoice_number)) {
        // Generate new invoice number (YYYY-XXXX format)
        $year = date('Y');
        $count = get_option('captain_invoice_count_' . $year, 0) + 1;
        update_option('captain_invoice_count_' . $year, $count);

        $invoice_number = $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
        $invoice_date = date('Y-m-d');
        $invoice_status = 'Unpaid';

        // Save invoice data
        update_post_meta($booking_id, '_booking_invoice_number', $invoice_number);
        update_post_meta($booking_id, '_booking_invoice_date', $invoice_date);
        update_post_meta($booking_id, '_booking_invoice_status', $invoice_status);
    }

    // Redirect to view invoice
    wp_redirect(admin_url('admin.php?page=captain-generate-invoice&booking_id=' . $booking_id));
    exit;
}
add_action('admin_post_captain_generate_invoice', 'captain_generate_invoice_action');

// Mark invoice as paid action
function captain_mark_invoice_paid_action() {
    // Check permissions and nonce
    if (!current_user_can('manage_options') || !isset($_GET['booking_id']) || !isset($_GET['_wpnonce']) || !wp_verify_nonce($_GET['_wpnonce'], 'mark_invoice_paid')) {
        wp_die('Unauthorized access');
    }

    $booking_id = intval($_GET['booking_id']);

    // Update invoice status
    update_post_meta($booking_id, '_booking_invoice_status', 'Paid');
    update_post_meta($booking_id, '_booking_payment_date', date('Y-m-d'));

    // Redirect back to booking
    wp_redirect(get_edit_post_link($booking_id, 'redirect'));
    exit;
}
add_action('admin_post_captain_mark_invoice_paid', 'captain_mark_invoice_paid_action');

// Invoice page callback
function captain_generate_invoice_page_callback() {
    if (!isset($_GET['booking_id'])) {
        wp_die('No booking specified');
    }

    $booking_id = intval($_GET['booking_id']);
    $booking = get_post($booking_id);

    if (!$booking || $booking->post_type !== 'booking') {
        wp_die('Invalid booking');
    }

    // Include the invoice template
    include CAPTAIN_CRM_PLUGIN_DIR . 'templates/invoice-template.php';
}