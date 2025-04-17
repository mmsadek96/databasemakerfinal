<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

$booking_id = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : 0;

if (!$booking_id) {
    echo '<p>Invalid booking ID.</p>';
    return;
}

// Check if current user has access to this booking
$client_id = get_post_meta($booking_id, '_booking_client_id', true);
$client_email = get_post_meta($client_id, '_client_email', true);
$current_user = wp_get_current_user();

if (!current_user_can('manage_options') && $current_user->user_email != $client_email) {
    echo '<p>You do not have permission to view this booking.</p>';
    return;
}

$booking = get_post($booking_id);
$service_type = get_post_meta($booking_id, '_booking_service_type', true);
$start_date = get_post_meta($booking_id, '_booking_start_date', true);
$end_date = get_post_meta($booking_id, '_booking_end_date', true);
$destination = get_post_meta($booking_id, '_booking_destination', true);
$price = get_post_meta($booking_id, '_booking_price', true);
$payment_status = get_post_meta($booking_id, '_booking_payment_status', true) ?: 'pending';
$payment_released = get_post_meta($booking_id, '_booking_payment_released', true) == 'yes';
$tip_amount = get_post_meta($booking_id, '_booking_tip_amount', true) ?: 0;

// Format dates
$formatted_start = date('F j, Y', strtotime($start_date));
$formatted_end = !empty($end_date) ? date('F j, Y', strtotime($end_date)) : $formatted_start;

// Get destination name
$destinations = array(
    'greece' => 'Greece',
    'bvi' => 'British Virgin Islands',
    'croatia' => 'Croatia',
    'italy' => 'Italy',
    'spain' => 'Spain',
    'turkey' => 'Turkey',
    'other' => 'Other'
);
$destination_name = isset($destinations[$destination]) ? $destinations[$destination] : ucfirst($

// Get destination name
$destinations = array(
    'greece' => 'Greece',
    'bvi' => 'British Virgin Islands',
    'croatia' => 'Croatia',
    'italy' => 'Italy',
    'spain' => 'Spain',
    'turkey' => 'Turkey',
    'other' => 'Other'
);
$destination_name = isset($destinations[$destination]) ? $destinations[$destination] : ucfirst($destination);

// Get service type name
$service_types = array(
    'charter' => 'Private Charter',
    'flotilla' => 'Flotilla Leading',
    'instruction' => 'Sailing Instruction',
    'delivery' => 'Yacht Delivery'
);
$service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : ucfirst($service_type);

?>
<div class="captain-booking-details">
    <h2>Booking Details</h2>

    <div class="booking-summary">
        <div class="booking-info">
            <h3><?php echo esc_html($service_display); ?> in <?php echo esc_html($destination_name); ?></h3>

            <div class="booking-dates">
                <p><strong>Dates:</strong> <?php echo esc_html($formatted_start); ?> to <?php echo esc_html($formatted_end); ?></p>
            </div>

            <div class="booking-status">
                <p><strong>Status:</strong> <?php echo ucfirst($payment_status); ?></p>

                <?php if ($payment_status == 'paid' && !$payment_released): ?>
                    <p class="payment-holding">Payment will be released to the crew after service completion.</p>
                <?php elseif ($payment_released): ?>
                    <p class="payment-released">Payment has been released to the crew.</p>
                <?php endif; ?>
            </div>

            <div class="booking-price">
                <p><strong>Total Price:</strong> €<?php echo number_format($price, 2); ?></p>

                <?php if ($tip_amount > 0): ?>
                    <p><strong>Tip Amount:</strong> €<?php echo number_format($tip_amount, 2); ?></p>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <?php if ($payment_status == 'paid' && strtotime($end_date) <= current_time('timestamp')): ?>
    <div class="tip-section">
        <h3>Add a Tip for the Crew</h3>
        <p>Show your appreciation for excellent service by adding a tip.</p>

        <form id="tip-form" class="tip-form">
            <div class="tip-amount-options">
                <label>
                    <input type="radio" name="tip_percentage" value="10"> 10% (€<?php echo number_format($price * 0.1, 2); ?>)
                </label>
                <label>
                    <input type="radio" name="tip_percentage" value="15"> 15% (€<?php echo number_format($price * 0.15, 2); ?>)
                </label>
                <label>
                    <input type="radio" name="tip_percentage" value="20"> 20% (€<?php echo number_format($price * 0.2, 2); ?>)
                </label>
                <label>
                    <input type="radio" name="tip_percentage" value="custom"> Custom Amount
                </label>
            </div>

            <div class="custom-amount" style="display: none;">
                <label for="custom_tip">Custom Tip Amount (€):</label>
                <input type="number" id="custom_tip" name="custom_tip" min="1" step="1">
            </div>

            <div class="payment-method">
                <h4>Payment Method</h4>
                <label>
                    <input type="radio" name="payment_method" value="credit_card" checked> Credit Card
                </label>
                <!-- Add more payment methods as needed -->
            </div>

            <input type="hidden" name="booking_id" value="<?php echo esc_attr($booking_id); ?>">
            <?php wp_nonce_field('captain_tip_nonce', 'tip_nonce'); ?>

            <button type="submit" class="tip-submit-button">Send Tip</button>
        </form>

        <div id="tip-response"></div>
    </div>

    <script>
    jQuery(document).ready(function($) {
        // Toggle custom amount input
        $('input[name="tip_percentage"]').on('change', function() {
            if ($(this).val() === 'custom') {
                $('.custom-amount').show();
            } else {
                $('.custom-amount').hide();
            }
        });

        // Handle tip submission
        $('#tip-form').on('submit', function(e) {
            e.preventDefault();

            var tipPercentage = $('input[name="tip_percentage"]:checked').val();
            var customTip = $('#custom_tip').val();
            var tipAmount = 0;

            if (tipPercentage === 'custom') {
                tipAmount = parseFloat(customTip);
            } else {
                tipAmount = <?php echo floatval($price); ?> * (parseFloat(tipPercentage) / 100);
            }

            if (isNaN(tipAmount) || tipAmount <= 0) {
                $('#tip-response').html('<p class="error">Please enter a valid tip amount.</p>');
                return;
            }

            $('#tip-response').html('<p class="loading">Processing your tip...</p>');

            $.ajax({
                url: captain_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'captain_process_tip',
                    booking_id: <?php echo intval($booking_id); ?>,
                    tip_amount: tipAmount,
                    nonce: $('#tip_nonce').val()
                },
                success: function(response) {
                    if (response.success) {
                        $('#tip-response').html('<p class="success">Thank you for your tip! The crew will appreciate your generosity.</p>');
                        $('#tip-form').hide();

                        // Update displayed tip amount
                        $('.booking-price').append('<p><strong>New Tip Total:</strong> €' + response.data.new_tip_total.toFixed(2) + '</p>');
                    } else {
                        $('#tip-response').html('<p class="error">Error: ' + response.data + '</p>');
                    }
                },
                error: function() {
                    $('#tip-response').html('<p class="error">An error occurred. Please try again.</p>');
                }
            });
        });
    });
    </script>
    <?php endif; ?>
</div>

<style>
.captain-booking-details {
    max-width: 800px;
    margin: 30px auto;
    padding: 30px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
}

.booking-summary {
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid #eee;
}

.booking-info h3 {
    margin-top: 0;
    color: #2b6cb0;
}

.payment-holding {
    color: #805ad5;
    font-style: italic;
}

.payment-released {
    color: #38a169;
    font-weight: bold;
}

.tip-section {
    background: #f9f9ff;
    padding: 20px;
    border-radius: 6px;
    margin-top: 30px;
}

.tip-amount-options {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 20px;
}

.tip-amount-options label {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.tip-amount-options label:hover {
    border-color: #4299e1;
}

.custom-amount {
    margin-bottom: 20px;
}

.custom-amount input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 150px;
}

.payment-method {
    margin-bottom: 20px;
}

.tip-submit-button {
    background: #38a169;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s;
}

.tip-submit-button:hover {
    background: #2f855a;
}

#tip-response .error {
    color: #e53e3e;
}

#tip-response .success {
    color: #38a169;
}

#tip-response .loading {
    color: #4299e1;
}
</style>