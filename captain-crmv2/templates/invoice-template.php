<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Get booking data
$client_id = get_post_meta($booking_id, '_booking_client_id', true);
$client = get_post($client_id);

$client_name = $client ? $client->post_title : '';
$client_email = get_post_meta($client_id, '_client_email', true);
$client_phone = get_post_meta($client_id, '_client_phone', true);
$client_address = get_post_meta($client_id, '_client_address', true);

$service_type = get_post_meta($booking_id, '_booking_service_type', true);
$service_types = array(
    'charter' => 'Private Charter',
    'flotilla' => 'Flotilla Leading',
    'instruction' => 'Sailing Instruction',
    'delivery' => 'Yacht Delivery'
);
$service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;

$destination = get_post_meta($booking_id, '_booking_destination', true);
$destinations = array(
    'greece' => 'Greece',
    'bvi' => 'British Virgin Islands',
    'other' => 'Other'
);
$destination_display = isset($destinations[$destination]) ? $destinations[$destination] : $destination;

$start_date = get_post_meta($booking_id, '_booking_start_date', true);
$end_date = get_post_meta($booking_id, '_booking_end_date', true);

$crew_size = get_post_meta($booking_id, '_booking_crew_size', true);
$crew_services = get_post_meta($booking_id, '_booking_crew_services', true);
$services_labels = array(
    'captain' => 'Captain Only',
    'chef' => 'Chef Only',
    'both' => 'Captain and Chef',
    'none' => 'No Crew Services'
);
$crew_services_display = isset($services_labels[$crew_services]) ? $services_labels[$crew_services] : '';
$price = get_post_meta($booking_id, '_booking_price', true);

$invoice_number = get_post_meta($booking_id, '_booking_invoice_number', true);
$invoice_date = get_post_meta($booking_id, '_booking_invoice_date', true);
$invoice_status = get_post_meta($booking_id, '_booking_invoice_status', true);
$payment_date = get_post_meta($booking_id, '_booking_payment_date', true);

// Get your company details from options
$company_name = get_option('captain_company_name', 'Malek Msadek - Yacht Captain Services');
$company_address = get_option('captain_company_address', 'Your Business Address');
$company_email = get_option('captain_company_email', get_option('admin_email'));
$company_phone = get_option('captain_company_phone', 'Your Phone Number');
$company_vat = get_option('captain_company_vat', '');

// If price is empty, set to 0
if (empty($price)) {
    $price = 0;
}

// Calculate tax if applicable
$tax_rate = get_option('captain_tax_rate', 0); // Tax rate as percentage
$tax_amount = ($price * $tax_rate) / 100;
$total_amount = $price + $tax_amount;

// Generate date strings
$formatted_invoice_date = date('F j, Y', strtotime($invoice_date));
$formatted_start_date = date('F j, Y', strtotime($start_date));
$formatted_end_date = !empty($end_date) ? date('F j, Y', strtotime($end_date)) : '';
$formatted_payment_date = !empty($payment_date) ? date('F j, Y', strtotime($payment_date)) : '';

// Service period text
$service_period = $formatted_start_date;
if (!empty($formatted_end_date)) {
    $service_period .= ' to ' . $formatted_end_date;
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #<?php echo esc_html($invoice_number); ?></title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            border: 1px solid #ddd;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .company-info {
            max-width: 50%;
        }
        .invoice-title {
            text-align: right;
        }
        .invoice-title h1 {
            color: #005d8c;
            margin: 0 0 5px;
        }
        .invoice-details {
            margin-bottom: 10px;
            text-align: right;
        }
        .client-info {
            margin-bottom: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
        }
        .text-right {
            text-align: right;
        }
        .totals {
            width: 300px;
            float: right;
            margin-bottom: 30px;
        }
        .totals table {
            width: 100%;
        }
        .notes {
            clear: both;
            margin-top: 40px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .status-paid {
            color: #28a745;
            font-weight: bold;
        }
        .status-unpaid {
            color: #dc3545;
            font-weight: bold;
        }
        .payment-info {
            margin-top: 30px;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #777;
            font-size: 12px;
        }
        @media print {
            body {
                padding: 0;
            }
            .invoice-container {
                border: none;
                box-shadow: none;
                padding: 0;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-info">
                <h2><?php echo esc_html($company_name); ?></h2>
                <p><?php echo nl2br(esc_html($company_address)); ?></p>
                <p>
                    Email: <?php echo esc_html($company_email); ?><br>
                    Phone: <?php echo esc_html($company_phone); ?>
                </p>
                <?php if (!empty($company_vat)) : ?>
                <p>VAT Number: <?php echo esc_html($company_vat); ?></p>
                <?php endif; ?>
            </div>

            <div class="invoice-title">
                <h1>INVOICE</h1>
                <div class="invoice-details">
                    <p>
                        <strong>Invoice Number:</strong> <?php echo esc_html($invoice_number); ?><br>
                        <strong>Invoice Date:</strong> <?php echo esc_html($formatted_invoice_date); ?><br>
                        <strong>Status:</strong>
                        <span class="<?php echo $invoice_status === 'Paid' ? 'status-paid' : 'status-unpaid'; ?>">
                            <?php echo esc_html($invoice_status); ?>
                        </span>
                        <?php if ($invoice_status === 'Paid' && !empty($formatted_payment_date)) : ?>
                        <br><strong>Payment Date:</strong> <?php echo esc_html($formatted_payment_date); ?>
                        <?php endif; ?>
                    </p>
                </div>
            </div>
        </div>

        <div class="client-info">
            <h3>Bill To:</h3>
            <p>
                <strong><?php echo esc_html($client_name); ?></strong><br>
                <?php if (!empty($client_address)) : ?>
                <?php echo nl2br(esc_html($client_address)); ?><br>
                <?php endif; ?>
                <?php if (!empty($client_email)) : ?>
                Email: <?php echo esc_html($client_email); ?><br>
                <?php endif; ?>
                <?php if (!empty($client_phone)) : ?>
                Phone: <?php echo esc_html($client_phone); ?>
                <?php endif; ?>
            </p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Service Period</th>
                    <th>Location</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><?php echo esc_html($service_display); ?> (<?php echo esc_html($crew_services_display); ?>)</td>
                    <td><?php echo esc_html($service_period); ?></td>
                    <td><?php echo esc_html($destination_display); ?></td>
                    <td class="text-right">€<?php echo number_format($price, 2); ?></td>
                </tr>
                <?php if (!empty($booking->post_content)) : ?>
                <tr>
                    <td colspan="4">
                        <strong>Details:</strong><br>
                        <?php echo nl2br(esc_html($booking->post_content)); ?>
                    </td>
                </tr>
                <?php endif; ?>
            </tbody>
        </table>

        <div class="totals">
            <table>
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">€<?php echo number_format($price, 2); ?></td>
                </tr>
                <?php if ($tax_rate > 0) : ?>
                <tr>
                    <td>Tax (<?php echo $tax_rate; ?>%):</td>
                    <td class="text-right">€<?php echo number_format($tax_amount, 2); ?></td>
                </tr>
                <?php endif; ?>
                <tr>
                    <td><strong>Total:</strong></td>
                    <td class="text-right"><strong>€<?php echo number_format($total_amount, 2); ?></strong></td>
                </tr>
            </table>
        </div>

        <div class="notes">
            <h3>Payment Information:</h3>
            <p><?php echo nl2br(esc_html(get_option('captain_payment_info', 'Please make payment to the bank account details below:'))); ?></p>
            <p><?php echo nl2br(esc_html(get_option('captain_bank_details', ''))); ?></p>
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print();" style="padding: 10px 20px;">Print Invoice</button>
            <a href="<?php echo get_edit_post_link($booking_id); ?>" style="margin-left: 10px; display: inline-block; padding: 10px 20px; background: #f0f0f0; text-decoration: none; color: #333;">Back to Booking</a>
        </div>
    </div>
</body>
</html>