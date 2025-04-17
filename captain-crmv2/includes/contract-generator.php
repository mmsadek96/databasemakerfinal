<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Captain_Contract_Generator {
    private $api_key;
    private $provider;

    public function __construct() {
        $this->api_key = get_option('captain_ai_api_key', '');
        $this->provider = get_option('captain_ai_provider', 'openai');

        add_action('add_meta_boxes', array($this, 'add_contract_meta_box'));
        add_action('wp_ajax_captain_generate_contract', array($this, 'ajax_generate_contract'));
    }

    public function add_contract_meta_box() {
        add_meta_box(
            'booking_contract_metabox',
            'Contract Generation',
            array($this, 'contract_meta_box_callback'),
            'booking',
            'normal',
            'high'
        );
    }

    public function contract_meta_box_callback($post) {
        $booking_id = $post->ID;
        $contract_content = get_post_meta($booking_id, '_booking_contract', true);
        $contract_status = get_post_meta($booking_id, '_booking_contract_status', true);
        $destination = get_post_meta($booking_id, '_booking_destination', true);

        wp_nonce_field('captain_contract_nonce', 'contract_nonce');

        echo '<div class="contract-generator-panel">';

        if (!empty($contract_content)) {
            echo '<div class="contract-status">';
            echo '<p><strong>Contract Status:</strong> ' . esc_html($contract_status ?: 'Draft') . '</p>';
            echo '</div>';

            echo '<div class="contract-actions">';
            echo '<button type="button" class="button view-contract">View Contract</button> ';
            echo '<button type="button" class="button regenerate-contract">Regenerate Contract</button> ';
            echo '<button type="button" class="button send-contract">Send to Client</button>';
            echo '</div>';

            echo '<div class="contract-preview" style="display:none;">';
            echo '<h3>Contract Preview</h3>';
            echo '<div class="contract-content">' . wpautop($contract_content) . '</div>';
            echo '</div>';
        } else {
            echo '<p>No contract has been generated yet. Use the form below to create a contract.</p>';
            echo '<div class="contract-generator-form">';
            echo '<p><label for="contract_destination">Destination Country:</label> ';
            echo '<select id="contract_destination" name="contract_destination">';
            echo '<option value="' . esc_attr($destination) . '">' . esc_html($this->get_destination_name($destination)) . '</option>';
            echo '</select></p>';

            echo '<p><label for="contract_language">Contract Language:</label> ';
            echo '<select id="contract_language" name="contract_language">';
            echo '<option value="english">English</option>';
            echo '<option value="french">French</option>';
            echo '<option value="spanish">Spanish</option>';
            echo '<option value="italian">Italian</option>';
            echo '<option value="greek">Greek</option>';
            echo '</select></p>';

            echo '<p><label for="ai_provider">AI Provider:</label> ';
            echo '<select id="ai_provider" name="ai_provider">';
            echo '<option value="openai">OpenAI</option>';
            echo '<option value="gemini">Google Gemini</option>';
            echo '</select></p>';

            echo '<button type="button" class="button button-primary generate-contract" data-booking-id="' . esc_attr($booking_id) . '">Generate Contract</button>';
            echo '<div class="generation-status"></div>';
            echo '</div>';
        }

        echo '</div>';
        ?>
        <script>
        jQuery(document).ready(function($) {
            $('.generate-contract').on('click', function() {
                var $button = $(this);
                var $status = $('.generation-status');
                $button.prop('disabled', true).text('Generating...');
                $status.html('<p>Generating contract, please wait...</p>');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'captain_generate_contract',
                        booking_id: $button.data('booking-id'),
                        destination: $('#contract_destination').val(),
                        language: $('#contract_language').val(),
                        provider: $('#ai_provider').val(),
                        nonce: $('#contract_nonce').val()
                    },
                    success: function(response) {
                        if (response.success) {
                            $status.html('<p class="success">Contract generated successfully!</p>');
                            location.reload();
                        } else {
                            $status.html('<p class="error">Error: ' + response.data + '</p>');
                            $button.prop('disabled', false).text('Generate Contract');
                        }
                    },
                    error: function() {
                        $status.html('<p class="error">An error occurred. Please try again.</p>');
                        $button.prop('disabled', false).text('Generate Contract');
                    }
                });
            });

            $('.view-contract').on('click', function() {
                $('.contract-preview').toggle();
            });

            $('.regenerate-contract').on('click', function() {
                if (confirm('Are you sure you want to regenerate the contract? The current version will be replaced.')) {
                    $('.contract-generator-form').show();
                }
            });
        });
        </script>
        <style>
        .contract-generator-panel { margin: 15px 0; }
        .contract-preview { margin-top: 20px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; }
        .generation-status .success { color: green; }
        .generation-status .error { color: red; }
        </style>
        <?php
    }

        public function ajax_generate_contract() {
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_contract_nonce')) {
            wp_send_json_error('Security check failed');
            return;
        }
    
        $booking_id = intval($_POST['booking_id'] ?? 0);
        $destination = sanitize_text_field($_POST['destination'] ?? '');
        $language = sanitize_text_field($_POST['language'] ?? 'english');
        $provider = sanitize_text_field($_POST['provider'] ?? $this->provider);
    
        if (!$booking_id) {
            wp_send_json_error('Invalid booking ID.');
            return;
        }
    
        $booking = get_post($booking_id);
        if (!$booking) {
            wp_send_json_error('Booking not found.');
            return;
        }
    
        $client_id = get_post_meta($booking_id, '_booking_client_id', true);
        $client_name = get_the_title($client_id);
        $service_type = get_post_meta($booking_id, '_booking_service_type', true);
        $start_date = get_post_meta($booking_id, '_booking_start_date', true);
        $end_date = get_post_meta($booking_id, '_booking_end_date', true);
        $price = get_post_meta($booking_id, '_booking_price', true);
    
        if (empty($client_name) || empty($service_type) || empty($start_date) || empty($price)) {
            wp_send_json_error('Missing required booking data (client, service type, start date, or price).');
            return;
        }
    
        $contract = $this->generate_contract_with_ai(
            $provider, $destination, $language, $client_name,
            $service_type, $start_date, $end_date, $price
        );
    
        if (is_string($contract) && strlen(trim($contract)) > 0) {
            update_post_meta($booking_id, '_booking_contract', $contract);
            update_post_meta($booking_id, '_booking_contract_status', 'Draft');
            update_post_meta($booking_id, '_booking_contract_generated_date', current_time('mysql'));
            wp_send_json_success('Contract generated successfully.');
        } elseif (is_wp_error($contract)) {
            wp_send_json_error($contract->get_error_message());
        } else {
            wp_send_json_error('Contract generation failed: Unknown error.');
        }
    }


    private function generate_contract_with_ai($provider, $destination, $language, $client_name, $service_type, $start_date, $end_date, $price) {
        $formatted_start = date('F j, Y', strtotime($start_date));
        $formatted_end = !empty($end_date) ? date('F j, Y', strtotime($end_date)) : $formatted_start;
        $destination_name = $this->get_destination_name($destination);

        $prompt = "Generate a professional yacht charter contract for {$destination_name} in {$language} language with the following details:

Client Name: {$client_name}
Service Type: {$service_type}
Charter Period: {$formatted_start} to {$formatted_end}
Price: €{$price}

The contract should include:
1. Full legal details specific to {$destination_name}'s maritime and tourism laws
2. Payment terms (30% deposit, remainder due 30 days before charter)
3. Cancellation policy
4. Responsibilities of the captain and crew
5. Client responsibilities and liabilities
6. Insurance details
7. Jurisdiction and governing law specific to {$destination_name}
8. Force majeure clauses

Make it comprehensive yet clear, with appropriate legal language for {$destination_name}.";

        return $provider === 'openai' ? $this->generate_with_openai($prompt) : $this->generate_with_gemini($prompt);
    }

        private function generate_with_openai($prompt) {
        if (empty($this->api_key)) {
            return new WP_Error('no_api_key', 'OpenAI API key is missing. Please configure it in the plugin settings.');
        }
    
        $api_url = 'https://api.openai.com/v1/chat/completions';
    
        $request_body = array(
            'model' => 'gpt-4',
            'messages' => array(
                array('role' => 'system', 'content' => 'You are a legal expert specializing in international maritime law and yacht charter contracts.'),
                array('role' => 'user', 'content' => $prompt)
            ),
            'temperature' => 0.7,
            'max_tokens' => 4000
        );
    
        $args = array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type'  => 'application/json'
            ),
            'body'    => json_encode($request_body),
            'timeout' => 60
        );
    
        $response = wp_remote_post($api_url, $args);
    
        if (is_wp_error($response)) {
            error_log('[Captain CRM] OpenAI Error: ' . $response->get_error_message());
            return new WP_Error('api_error', 'OpenAI API Error: ' . $response->get_error_message());
        }
    
        $body = json_decode(wp_remote_retrieve_body($response), true);
        error_log('[Captain CRM] OpenAI Raw Response: ' . print_r($body, true));
    
        if (!isset($body['choices'][0]['message']['content'])) {
            return new WP_Error('bad_response', 'Unexpected OpenAI response format.');
        }
    
        return $body['choices'][0]['message']['content'];
    }


    private function generate_with_gemini($prompt) {
        if (empty($this->api_key)) {
            error_log('Missing Gemini API key');
            return false;
        }

        $api_url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' . $this->api_key;

        $args = array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array(
                'contents' => array(
                    array('parts' => array(array('text' => $prompt)))
                ),
                'generationConfig' => array(
                    'temperature' => 0.7,
                    'maxOutputTokens' => 4000
                )
            )),
            'timeout' => 60
        );

        $response = wp_remote_post($api_url, $args);

        if (is_wp_error($response)) {
            error_log('Gemini API Error: ' . $response->get_error_message());
            return false;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        error_log('Gemini Response: ' . print_r($body, true));

        if (isset($body['candidates'][0]['content']['parts'][0]['text'])) {
            return $body['candidates'][0]['content']['parts'][0]['text'];
        }

        error_log('Unexpected Gemini structure: ' . wp_remote_retrieve_body($response));
        return false;
    }

    private function get_destination_name($destination_code) {
        $destinations = array(
            'greece' => 'Greece',
            'bvi' => 'British Virgin Islands',
            'croatia' => 'Croatia',
            'italy' => 'Italy',
            'spain' => 'Spain',
            'turkey' => 'Turkey',
            'other' => 'Other'
        );
        return $destinations[$destination_code] ?? ucfirst($destination_code);
    }
}

new Captain_Contract_Generator();
