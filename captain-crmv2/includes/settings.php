<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Add settings page for invoice and CRM AI setup
function captain_add_settings_page() {
    add_submenu_page(
        'edit.php?post_type=booking',
        'CRM Settings',
        'Settings',
        'manage_options',
        'captain-settings',
        'captain_settings_page_callback'
    );
}
add_action('admin_menu', 'captain_add_settings_page');

// Settings page callback
function captain_settings_page_callback() {
    // Save settings if form is submitted
    if (isset($_POST['captain_settings_nonce']) && wp_verify_nonce($_POST['captain_settings_nonce'], 'captain_save_settings')) {
        // Company details
        update_option('captain_company_name', sanitize_text_field($_POST['company_name']));
        update_option('captain_company_address', sanitize_textarea_field($_POST['company_address']));
        update_option('captain_company_email', sanitize_email($_POST['company_email']));
        update_option('captain_company_phone', sanitize_text_field($_POST['company_phone']));
        update_option('captain_company_vat', sanitize_text_field($_POST['company_vat']));

        // Invoice settings
        update_option('captain_tax_rate', floatval($_POST['tax_rate']));
        update_option('captain_payment_info', sanitize_textarea_field($_POST['payment_info']));
        update_option('captain_bank_details', sanitize_textarea_field($_POST['bank_details']));

        // AI settings
        if (!empty($_POST['ai_provider'])) {
            update_option('captain_ai_provider', sanitize_text_field($_POST['ai_provider']));
        }

        if (!empty($_POST['openai_api_key'])) {
            $openai_key = trim(sanitize_text_field($_POST['openai_api_key']));
            if (preg_match('/^sk-/', $openai_key)) {
                update_option('captain_ai_api_key', $openai_key);
            } else {
                echo '<div class="notice notice-error"><p>Invalid OpenAI API key format. It should start with <code>sk-</code>.</p></div>';
            }
        }

        if (!empty($_POST['gemini_api_key'])) {
            update_option('captain_gemini_api_key', trim(sanitize_text_field($_POST['gemini_api_key'])));
        }

        echo '<div class="notice notice-success"><p>Settings saved successfully.</p></div>';
    }

    // Get current settings
    $company_name = get_option('captain_company_name', 'Malek Msadek - Yacht Captain Services');
    $company_address = get_option('captain_company_address', 'Your Business Address');
    $company_email = get_option('captain_company_email', get_option('admin_email'));
    $company_phone = get_option('captain_company_phone', 'Your Phone Number');
    $company_vat = get_option('captain_company_vat', '');

    $tax_rate = get_option('captain_tax_rate', 0);
    $payment_info = get_option('captain_payment_info', 'Please make payment to the bank account details below:');
    $bank_details = get_option('captain_bank_details', '');

    $ai_provider = get_option('captain_ai_provider', 'openai');
    $openai_api_key = get_option('captain_ai_api_key', '');
    $gemini_api_key = get_option('captain_gemini_api_key', '');
    ?>
    <div class="wrap">
        <h1>CRM Settings</h1>

        <form method="post" action="">
            <?php wp_nonce_field('captain_save_settings', 'captain_settings_nonce'); ?>

            <h2>Company Information</h2>
            <table class="form-table">
                <tr>
                    <th><label for="company_name">Company/Business Name</label></th>
                    <td><input type="text" id="company_name" name="company_name" value="<?php echo esc_attr($company_name); ?>" class="regular-text"></td>
                </tr>
                <tr>
                    <th><label for="company_address">Address</label></th>
                    <td><textarea id="company_address" name="company_address" rows="3" class="large-text"><?php echo esc_textarea($company_address); ?></textarea></td>
                </tr>
                <tr>
                    <th><label for="company_email">Email</label></th>
                    <td><input type="email" id="company_email" name="company_email" value="<?php echo esc_attr($company_email); ?>" class="regular-text"></td>
                </tr>
                <tr>
                    <th><label for="company_phone">Phone</label></th>
                    <td><input type="text" id="company_phone" name="company_phone" value="<?php echo esc_attr($company_phone); ?>" class="regular-text"></td>
                </tr>
                <tr>
                    <th><label for="company_vat">VAT/Tax Number</label></th>
                    <td><input type="text" id="company_vat" name="company_vat" value="<?php echo esc_attr($company_vat); ?>" class="regular-text"></td>
                </tr>
            </table>

            <h2>Invoice Settings</h2>
            <table class="form-table">
                <tr>
                    <th><label for="tax_rate">Tax Rate (%)</label></th>
                    <td>
                        <input type="number" id="tax_rate" name="tax_rate" value="<?php echo esc_attr($tax_rate); ?>" class="small-text" min="0" step="0.01">
                        <p class="description">Enter the tax rate as a percentage (e.g., 20 for 20% VAT). Enter 0 for no tax.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="payment_info">Payment Information</label></th>
                    <td>
                        <textarea id="payment_info" name="payment_info" rows="2" class="large-text"><?php echo esc_textarea($payment_info); ?></textarea>
                        <p class="description">This text appears in the payment information section of invoices.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="bank_details">Bank Details</label></th>
                    <td>
                        <textarea id="bank_details" name="bank_details" rows="4" class="large-text"><?php echo esc_textarea($bank_details); ?></textarea>
                        <p class="description">Enter your bank account details for receiving payments.</p>
                    </td>
                </tr>
            </table>

            <h2>AI Contract Generation</h2>
            <table class="form-table">
                <tr>
                    <th><label for="ai_provider">Default AI Provider</label></th>
                    <td>
                        <select id="ai_provider" name="ai_provider">
                            <option value="openai" <?php selected($ai_provider, 'openai'); ?>>OpenAI (GPT-4)</option>
                            <option value="gemini" <?php selected($ai_provider, 'gemini'); ?>>Google Gemini</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="openai_api_key">OpenAI API Key</label></th>
                    <td>
                        <input type="password" id="openai_api_key" name="openai_api_key" value="<?php echo esc_attr($openai_api_key); ?>" class="regular-text">
                        <p class="description">Enter your OpenAI API key for contract generation. Must begin with <code>sk-</code>.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="gemini_api_key">Google Gemini API Key</label></th>
                    <td>
                        <input type="password" id="gemini_api_key" name="gemini_api_key" value="<?php echo esc_attr($gemini_api_key); ?>" class="regular-text">
                        <p class="description">Enter your Google Gemini API key for contract generation.</p>
                    </td>
                </tr>
            </table>

            <p class="submit">
                <input type="submit" name="submit" id="submit" class="button button-primary" value="Save Settings">
            </p>
        </form>
    </div>
    <?php
}
