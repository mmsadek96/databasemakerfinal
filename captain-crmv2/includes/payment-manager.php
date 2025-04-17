<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Captain_Payment_Manager {

    public function __construct() {
        // Add meta box for payment management
        add_action('add_meta_boxes', array($this, 'add_payment_meta_box'));

        // Add payment status to bookings
        add_action('save_post', array($this, 'save_payment_meta'));

        // Handle payment actions
        add_action('admin_post_captain_process_payment', array($this, 'process_payment_action'));
        add_action('admin_post_captain_release_payment', array($this, 'release_payment_action'));

        // AJAX handlers for tipping
        add_action('wp_ajax_captain_process_tip', array($this, 'process_tip'));
        add_action('wp_ajax_nopriv_captain_process_tip', array($this, 'process_tip'));
    }

    public function add_payment_meta_box() {
        add_meta_box(
            'booking_payment_metabox',
            'Payment Management',
            array($this, 'payment_meta_box_callback'),
            'booking',
            'side',
            'high'
        );
    }

    public function payment_meta_box_callback($post) {
        $booking_id = $post->ID;
        $payment_status = get_post_meta($booking_id, '_booking_payment_status', true) ?: 'pending';
        $deposit_amount = get_post_meta($booking_id, '_booking_deposit_amount', true);
        $deposit_paid = get_post_meta($booking_id, '_booking_deposit_paid', true) == 'yes';
        $full_amount = get_post_meta($booking_id, '_booking_price', true);
        $payment_released = get_post_meta($booking_id, '_booking_payment_released', true) == 'yes';
        $payment_release_date = get_post_meta($booking_id, '_booking_payment_release_date', true);
        $tip_amount = get_post_meta($booking_id, '_booking_tip_amount', true) ?: 0;
        
        // Ensure deposit_amount and full_amount are numeric
        $deposit_amount = is_numeric($deposit_amount) ? $deposit_amount : 0;
        $full_amount = is_numeric($full_amount) ? $full_amount : 0;
        $tip_amount = is_numeric($tip_amount) ? $tip_amount : 0;

        // Calculate deposit if not set (30% of total)
        if (empty($deposit_amount) && !empty($full_amount)) {
            $deposit_amount = round($full_amount * 0.3, 2);
            update_post_meta($booking_id, '_booking_deposit_amount', $deposit_amount);
        }

        wp_nonce_field('captain_payment_nonce', 'payment_nonce');

        echo '<div class="payment-status">';
        echo '<p><strong>Payment Status:</strong> ' . ucfirst($payment_status) . '</p>';

        if ($deposit_paid) {
            echo '<p class="deposit-status deposit-paid">Deposit Paid: €' . number_format($deposit_amount, 2) . '</p>';
        } else {
            echo '<p class="deposit-status deposit-pending">Deposit Pending: €' . number_format($deposit_amount, 2) . '</p>';
        }

        echo '<p><strong>Total Amount:</strong> €' . number_format($full_amount, 2) . '</p>';

        if ($tip_amount > 0) {
            echo '<p><strong>Tip Amount:</strong> €' . number_format($tip_amount, 2) . '</p>';
        }

        echo '</div>';

        echo '<div class="payment-actions">';

        // Show options based on current payment status
        if ($payment_status == 'pending' || $payment_status == 'partial') {
            // Option to mark deposit as paid
            if (!$deposit_paid) {
                echo '<p><a href="' . wp_nonce_url(admin_url('admin-post.php?action=captain_process_payment&booking_id=' . $booking_id . '&payment_type=deposit'), 'process_payment_' . $booking_id, 'payment_nonce') . '" class="button">Mark Deposit as Paid</a></p>';
            }

            // Option to mark full payment
            echo '<p><a href="' . wp_nonce_url(admin_url('admin-post.php?action=captain_process_payment&booking_id=' . $booking_id . '&payment_type=full'), 'process_payment_' . $booking_id, 'payment_nonce') . '" class="button">Mark as Fully Paid</a></p>';
        }

        // Option to release payment to employee
        if ($payment_status == 'paid' && !$payment_released) {
            // Get booking end date
            $end_date = get_post_meta($booking_id, '_booking_end_date', true);
            $current_date = current_time('Y-m-d');

            if (empty($end_date) || strtotime($current_date) >= strtotime($end_date)) {
                echo '<p><a href="' . wp_nonce_url(admin_url('admin-post.php?action=captain_release_payment&booking_id=' . $booking_id), 'release_payment_' . $booking_id, 'payment_nonce') . '" class="button button-primary">Release Payment to Employee</a></p>';
            } else {
                echo '<p class="payment-note">Payment will be available for release after the booking end date (' . date('F j, Y', strtotime($end_date)) . ').</p>';
            }
        }

        if ($payment_released && !empty($payment_release_date)) {
            echo '<p class="payment-released">Payment Released on ' . date('F j, Y', strtotime($payment_release_date)) . '</p>';
        }

        echo '</div>';

        // Add payment settings
        echo '<div class="payment-settings">';
        echo '<h4>Payment Settings</h4>';

        echo '<p><label for="booking_deposit_amount">Deposit Amount (€):</label><br>';
        echo '<input type="number" id="booking_deposit_amount" name="booking_deposit_amount" value="' . esc_attr($deposit_amount) . '" step="0.01" min="0"></p>';

        echo '<p><label for="booking_price">Total Price (€):</label><br>';
        echo '<input type="number" id="booking_price" name="booking_price" value="' . esc_attr($full_amount) . '" step="0.01" min="0"></p>';

        echo '</div>';

        echo '<style>
        .deposit-paid { color: green; }
        .deposit-pending { color: #f80; }
        .payment-released { color: green; font-weight: bold; }
        .payment-note { color: #777; font-style: italic; }
        </style>';
    }

    public function save_payment_meta($post_id) {
        // Check if nonce is set
        if (!isset($_POST['payment_nonce'])) {
            return;
        }

        // Verify nonce
        if (!wp_verify_nonce($_POST['payment_nonce'], 'captain_payment_nonce')) {
            return;
        }

        // Check if autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        // Check permissions
        if ('booking' !== $_POST['post_type'] || !current_user_can('edit_post', $post_id)) {
            return;
        }

        // Save deposit amount
        if (isset($_POST['booking_deposit_amount'])) {
            update_post_meta($post_id, '_booking_deposit_amount', floatval($_POST['booking_deposit_amount']));
        }

        // Save total price
        if (isset($_POST['booking_price'])) {
            update_post_meta($post_id, '_booking_price', floatval($_POST['booking_price']));
        }
    }

    public function process_payment_action() {
        // Verify user permissions
        if (!current_user_can('edit_posts')) {
            wp_die('Unauthorized access');
        }

        // Check nonce
        if (!isset($_GET['payment_nonce']) || !wp_verify_nonce($_GET['payment_nonce'], 'process_payment_' . $_GET['booking_id'])) {
            wp_die('Security check failed');
        }

        $booking_id = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : 0;
        $payment_type = isset($_GET['payment_type']) ? sanitize_text_field($_GET['payment_type']) : '';

        if (!$booking_id || !in_array($payment_type, array('deposit', 'full'))) {
            wp_die('Invalid parameters');
        }

        if ($payment_type == 'deposit') {
            // Mark deposit as paid
            update_post_meta($booking_id, '_booking_deposit_paid', 'yes');
            update_post_meta($booking_id, '_booking_deposit_date', current_time('mysql'));
            update_post_meta($booking_id, '_booking_payment_status', 'partial');
        } else {
            // Mark as fully paid
            update_post_meta($booking_id, '_booking_deposit_paid', 'yes');
            update_post_meta($booking_id, '_booking_payment_status', 'paid');
            update_post_meta($booking_id, '_booking_payment_date', current_time('mysql'));
        }

        // Redirect back to booking
        wp_redirect(get_edit_post_link($booking_id, 'redirect'));
        exit;
    }

    public function release_payment_action() {
        // Verify user permissions
        if (!current_user_can('edit_posts')) {
            wp_die('Unauthorized access');
        }

        // Check nonce
        if (!isset($_GET['payment_nonce']) || !wp_verify_nonce($_GET['payment_nonce'], 'release_payment_' . $_GET['booking_id'])) {
            wp_die('Security check failed');
        }

        $booking_id = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : 0;

        if (!$booking_id) {
            wp_die('Invalid booking ID');
        }

        // Check if payment is already released
        if (get_post_meta($booking_id, '_booking_payment_released', true) == 'yes') {
            wp_die('Payment already released');
        }

        // Check if booking is fully paid
        if (get_post_meta($booking_id, '_booking_payment_status', true) != 'paid') {
            wp_die('Booking must be fully paid before releasing payment');
        }

        // Mark payment as released
        update_post_meta($booking_id, '_booking_payment_released', 'yes');
        update_post_meta($booking_id, '_booking_payment_release_date', current_time('mysql'));

        // TODO: In a real implementation, you would trigger payment to employee here

        // Redirect back to booking
        wp_redirect(get_edit_post_link($booking_id, 'redirect'));
        exit;
    }

    public function process_tip() {
        // Verify nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_tip_nonce')) {
            wp_send_json_error('Security check failed');
            return;
        }

        $booking_id = isset($_POST['booking_id']) ? intval($_POST['booking_id']) : 0;
        $tip_amount = isset($_POST['tip_amount']) ? floatval($_POST['tip_amount']) : 0;

        if (!$booking_id || $tip_amount <= 0) {
            wp_send_json_error('Invalid parameters');
            return;
        }

        // Get current tip amount (if any)
        $current_tip = get_post_meta($booking_id, '_booking_tip_amount', true) ?: 0;
        $current_tip = is_numeric($current_tip) ? floatval($current_tip) : 0;

        // Add new tip to current tip
        $total_tip = $current_tip + $tip_amount;

        // Update tip amount
        update_post_meta($booking_id, '_booking_tip_amount', $total_tip);
        update_post_meta($booking_id, '_booking_tip_date', current_time('mysql'));

        // TODO: In a real implementation, process payment here

        wp_send_json_success(array(
            'message' => 'Tip processed successfully',
            'new_tip_total' => $total_tip
        ));
    }
}

// Initialize the payment manager
new Captain_Payment_Manager();