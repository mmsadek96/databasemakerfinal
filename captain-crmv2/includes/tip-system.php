<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Register shortcode for tip payment page
function captain_tip_payment_shortcode() {
    ob_start();

    $token = isset($_GET['token']) ? sanitize_text_field($_GET['token']) : '';

    if (empty($token)) {
        echo '<p>Invalid tip payment link.</p>';
        return ob_get_clean();
    }

    // Find booking by token
    global $wpdb;
    $booking_id = $wpdb->get_var($wpdb->prepare(
        "SELECT post_id FROM {$wpdb->postmeta}
        WHERE meta_key = '_booking_tip_token' AND meta_value = %s",
        $token
    ));

    if (!$booking_id) {
        echo '<p>Invalid or expired tip payment link.</p>';
        return ob_get_clean();
    }

    // Check if tip already paid
    $tip_paid = get_post_meta($booking_id, '_booking_tip_paid', true);
    if ($tip_paid == 'yes') {
        echo '<p>Thank you! You have already provided a tip for this service.</p>';
        return ob_get_clean();
    }

    // Get booking and employee details
    $booking = get_post($booking_id);
    $service_type = get_post_meta($booking_id, '_booking_service_type', true);
    $start_date = get_post_meta($booking_id, '_booking_start_date', true);
    $booking_price = get_post_meta($booking_id, '_booking_price', true);

    // Get client name
    $client_id = get_post_meta($booking_id, '_booking_client_id', true);
    $client_name = get_the_title($client_id);

    // Format service name
    $service_types = array(
        'charter' => 'Private Charter',
        'flotilla' => 'Flotilla Leading',
        'instruction' => 'Sailing Instruction',
        'delivery' => 'Yacht Delivery'
    );
    $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;

    ?>
    <div class="captain-tip-payment">
        <h2>Leave a Tip for Your Yacht Captain</h2>

        <div class="service-details">
            <h3>Service Details</h3>
            <p><strong>Service:</strong> <?php echo esc_html($service_display); ?></p>
            <p><strong>Date:</strong> <?php echo date('F j, Y', strtotime($start_date)); ?></p>
            <p><strong>Client:</strong> <?php echo esc_html($client_name); ?></p>
        </div>

        <div class="tip-form">
            <h3>Select Tip Amount</h3>

            <form id="tip-payment-form" method="post">
                <div class="tip-options">
                    <?php
                    // Calculate suggested tip amounts
                    $price = floatval($booking_price);
                    if ($price > 0) {
                        $tip_options = array(
                            '10' => number_format($price * 0.10, 2),
                            '15' => number_format($price * 0.15, 2),
                            '20' => number_format($price * 0.20, 2)
                        );

                        foreach ($tip_options as $percent => $amount) {
                            echo '<label>';
                            echo '<input type="radio" name="tip_amount" value="' . esc_attr($amount) . '">';
                            echo $percent . '% (€' . esc_html($amount) . ')';
                            echo '</label>';
                        }
                    }
                    ?>
                    <label>
                        <input type="radio" name="tip_amount" value="custom" checked>
                        Custom Amount
                    </label>
                </div>

                <div class="custom-amount">
                    <label for="custom_tip">Enter tip amount (€):</label>
                    <input type="number" id="custom_tip" name="custom_tip" min="1" step="1" value="20">
                </div>

                <div class="payment-details">
                    <h4>Payment Method</h4>
                    <div class="payment-methods">
                        <label>
                            <input type="radio" name="payment_method" value="credit_card" checked>
                            Credit Card
                        </label>
                        <!-- Add other payment methods as needed -->
                    </div>

                    <!-- Simplified credit card fields for illustration -->
                    <div class="card-details">
                        <div class="form-row">
                            <label for="card_number">Card Number</label>
                            <input type="text" id="card_number" name="card_number" placeholder="1234 5678 9012 3456">
                        </div>

                        <div class="form-row">
                            <div class="half-width">
                                <label for="expiry">Expiry (MM/YY)</label>
                                <input type="text" id="expiry" name="expiry" placeholder="MM/YY">
                            </div>
                            <div class="half-width">
                                <label for="cvv">CVV</label>
                                <input type="text" id="cvv" name="cvv" placeholder="123">
                            </div>
                        </div>
                    </div>
                </div>

                <input type="hidden" name="booking_id" value="<?php echo esc_attr($booking_id); ?>">
                <input type="hidden" name="token" value="<?php echo esc_attr($token); ?>">
                <?php wp_nonce_field('captain_process_tip', 'tip_nonce'); ?>

                <button type="submit" class="submit-tip-btn">Submit Tip</button>
            </form>

            <div id="payment-response"></div>
        </div>
    </div>

    <script>
    jQuery(document).ready(function($) {
        // Toggle custom amount input
        $('input[name="tip_amount"]').on('change', function() {
            if ($(this).val() === 'custom') {
                $('.custom-amount').show();
            } else {
                $('.custom-amount').hide();
            }
        });

        // Process payment
        $('#tip-payment-form').on('submit', function(e) {
            e.preventDefault();

            // Validate form
            var tipAmount = $('input[name="tip_amount"]:checked').val();
            if (tipAmount === 'custom') {
                tipAmount = $('#custom_tip').val();
            }

            if (!tipAmount || isNaN(parseFloat(tipAmount)) || parseFloat(tipAmount) <= 0) {
                $('#payment-response').html('<p class="error">Please enter a valid tip amount.</p>');
                return;
            }

            // Here you would typically integrate with a payment gateway
            // For this demo, we'll just simulate a successful payment

            $('#payment-response').html('<p class="processing">Processing payment...</p>');

            // Simulate processing
            setTimeout(function() {
                $.ajax({
                    url: captain_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'captain_process_tip_payment',
                        booking_id: $('input[name="booking_id"]').val(),
                        token: $('input[name="token"]').val(),
                        amount: tipAmount,
                        nonce: $('#tip_nonce').val()
                    },
                    success: function(response) {
                        if (response.success) {
                            $('#payment-response').html('<p class="success">' + response.data + '</p>');
                            $('#tip-payment-form').hide();
                        } else {
                            $('#payment-response').html('<p class="error">' + response.data + '</p>');
                        }
                    },
                    error: function() {
                        $('#payment-response').html('<p class="error">An error occurred. Please try again.</p>');
                    }
                });
            }, 2000);
        });
    });
    </script>
    <?php

    return ob_get_clean();
}
add_shortcode('captain_tip_payment', 'captain_tip_payment_shortcode');

// Create tip request
function captain_create_tip_request() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }

    $booking_id = isset($_POST['booking_id']) ? intval($_POST['booking_id']) : 0;
    $client_id = isset($_POST['client_id']) ? intval($_POST['client_id']) : 0;

    if (!$booking_id || !$client_id) {
        wp_send_json_error('Invalid booking or client ID');
        return;
    }

    // Create unique tip token
    $tip_token = md5('booking_' . $booking_id . '_' . time());

    // Save tip request data
    update_post_meta($booking_id, '_booking_tip_requested', 'yes');
    update_post_meta($booking_id, '_booking_tip_token', $tip_token);
    update_post_meta($booking_id, '_booking_tip_requested_date', current_time('mysql'));

    // Optional: Send email notification to client
    $client_email = get_post_meta($client_id, '_client_email', true);
    if ($client_email) {
        $subject = 'Tip Request for Your Recent Booking';
        $tip_link = site_url('tip-payment/?token=' . $tip_token);

        $message = "Hello,\n\n";
        $message .= "Your yacht captain would appreciate your feedback on their recent service.\n";
        $message .= "If you enjoyed your experience, you can leave a tip at the following link:\n\n";
        $message .= $tip_link . "\n\n";
        $message .= "Thank you for your support!\n";
        $message .= get_option('captain_company_name');

        wp_mail($client_email, $subject, $message);
    }

    wp_send_json_success('Tip request created successfully.');
}
add_action('wp_ajax_captain_create_tip_request', 'captain_create_tip_request');

// Get tip link
function captain_get_tip_link() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }

    $booking_id = isset($_POST['booking_id']) ? intval($_POST['booking_id']) : 0;

    if (!$booking_id) {
        wp_send_json_error('Invalid booking ID');
        return;
    }

    $tip_token = get_post_meta($booking_id, '_booking_tip_token', true);

    if (!$tip_token) {
        wp_send_json_error('Tip token not found');
        return;
    }

    $tip_link = site_url('tip-payment/?token=' . $tip_token);
    wp_send_json_success($tip_link);
}
add_action('wp_ajax_captain_get_tip_link', 'captain_get_tip_link');

// Process tip payment
function captain_process_tip_payment() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_process_tip')) {
        wp_send_json_error('Security check failed');
        return;
    }

    $booking_id = isset($_POST['booking_id']) ? intval($_POST['booking_id']) : 0;
    $token = isset($_POST['token']) ? sanitize_text_field($_POST['token']) : '';
    $amount = isset($_POST['amount']) ? floatval($_POST['amount']) : 0;

    if (!$booking_id || !$token || $amount <= 0) {
        wp_send_json_error('Invalid payment data');
        return;
    }

    // Verify token
    $stored_token = get_post_meta($booking_id, '_booking_tip_token', true);
    if ($token !== $stored_token) {
        wp_send_json_error('Invalid payment token');
        return;
    }

    // Here you would process the actual payment with your payment gateway
    // For this demo, we'll just record the tip as paid

    // Update booking meta
    update_post_meta($booking_id, '_booking_tip_paid', 'yes');
    update_post_meta($booking_id, '_booking_tip_amount', $amount);
    update_post_meta($booking_id, '_booking_tip_date', current_time('mysql'));

    // Get employee email to notify them
    $employee_id = get_post_meta($booking_id, '_booking_employee_id', true);
    if ($employee_id) {
        $employee_email = get_post_meta($employee_id, '_employee_email', true);
        if ($employee_email) {
            $service_type = get_post_meta($booking_id, '_booking_service_type', true);
            $start_date = get_post_meta($booking_id, '_booking_start_date', true);
            $formatted_date = date('F j, Y', strtotime($start_date));

            $subject = 'Tip Received for Booking #' . $booking_id;
            $message = "Good news! You've received a tip of €" . number_format($amount, 2) . " for your service.\n\n";
            $message .= "Service: " . $service_type . "\n";
            $message .= "Date: " . $formatted_date . "\n\n";
            $message .= "Booking details can be viewed in your dashboard.";

            wp_mail($employee_email, $subject, $message);
        }
    }

    wp_send_json_success('Thank you for your tip! The crew appreciates your generosity.');
}
add_action('wp_ajax_nopriv_captain_process_tip_payment', 'captain_process_tip_payment');
add_action('wp_ajax_captain_process_tip_payment', 'captain_process_tip_payment');