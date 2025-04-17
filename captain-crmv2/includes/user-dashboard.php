<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Register shortcodes for dashboards
function captain_register_dashboard_shortcodes() {
    add_shortcode('captain_client_dashboard', 'captain_client_dashboard_shortcode');
    add_shortcode('captain_employee_dashboard', 'captain_employee_dashboard_shortcode');
}
add_action('init', 'captain_register_dashboard_shortcodes');

// Client Dashboard Shortcode
function captain_client_dashboard_shortcode($atts) {
    // Check if user is logged in
    if (!is_user_logged_in()) {
        return '<p>Please <a href="' . wp_login_url(get_permalink()) . '">log in</a> to view your dashboard.</p>';
    }
    
    $current_user = wp_get_current_user();
    
    // Find client by email
    $clients = get_posts(array(
        'post_type' => 'client',
        'posts_per_page' => 1,
        'meta_query' => array(
            array(
                'key' => '_client_email',
                'value' => $current_user->user_email,
                'compare' => '='
            )
        )
    ));
    
    if (empty($clients)) {
        return '<p>No client profile found for this account. Please contact us if you believe this is an error.</p>';
    }
    
    $client_id = $clients[0]->ID;
    
    // Start output buffer to capture HTML
    ob_start();
    
    // Include the client dashboard template
    include CAPTAIN_CRM_PLUGIN_DIR . 'templates/client-dashboard.php';
    
    // Return the buffered content
    return ob_get_clean();
}

// Employee Dashboard Shortcode
function captain_employee_dashboard_shortcode($atts) {
    // Check if user is logged in and has proper role
    if (!is_user_logged_in()) {
        return '<p>Please <a href="' . wp_login_url(get_permalink()) . '">log in</a> to view your dashboard.</p>';
    }
    
    $current_user = wp_get_current_user();
    $allowed_roles = array('administrator', 'captain', 'crew');
    
    // Check if current user has any of the allowed roles
    $can_access = false;
    foreach ($allowed_roles as $role) {
        if (in_array($role, $current_user->roles)) {
            $can_access = true;
            break;
        }
    }
    
    if (!$can_access) {
        return '<p>You do not have permission to access this dashboard.</p>';
    }
    
    // Get employee ID (if using employee CPT)
    $employee_id = 0;
    $employees = get_posts(array(
        'post_type' => 'employee',
        'posts_per_page' => 1,
        'meta_query' => array(
            array(
                'key' => '_employee_email',
                'value' => $current_user->user_email,
                'compare' => '='
            )
        )
    ));
    
    if (!empty($employees)) {
        $employee_id = $employees[0]->ID;
    }
    
    // Start output buffer to capture HTML
    ob_start();
    
    // Include the employee dashboard template
    include CAPTAIN_CRM_PLUGIN_DIR . 'templates/employee-dashboard.php';
    
    // Return the buffered content
    return ob_get_clean();
}

// Ajax handler for client bookings
function captain_get_client_bookings() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    $client_id = isset($_POST['client_id']) ? intval($_POST['client_id']) : 0;
    $status = isset($_POST['status']) ? sanitize_text_field($_POST['status']) : 'all';
    
    if (!$client_id) {
        wp_send_json_error('Invalid client ID');
        return;
    }
    
    // Build query args based on status
    $args = array(
        'post_type' => 'booking',
        'posts_per_page' => -1,
        'meta_key' => '_booking_client_id',
        'meta_value' => $client_id,
        'meta_compare' => '='
    );
    
    // Add date filtering if status is 'upcoming' or 'past'
    if ($status == 'upcoming' || $status == 'past') {
        $today = date('Y-m-d');
        $args['meta_query'] = array(
            array(
                'key' => '_booking_start_date',
                'value' => $today,
                'compare' => $status == 'upcoming' ? '>=' : '<',
                'type' => 'DATE'
            )
        );
    }
    
    $bookings = get_posts($args);
    
    ob_start();
    if ($bookings) {
        echo '<div class="bookings-list">';
        foreach ($bookings as $booking) {
            $booking_id = $booking->ID;
            $service_type = get_post_meta($booking_id, '_booking_service_type', true);
            $start_date = get_post_meta($booking_id, '_booking_start_date', true);
            $destination = get_post_meta($booking_id, '_booking_destination', true);
            $booking_status = get_post_meta($booking_id, '_booking_status', true);
            $payment_status = get_post_meta($booking_id, '_booking_payment_status', true);
            
            // Get service type and destination labels
            $service_types = array(
                'charter' => 'Private Charter',
                'flotilla' => 'Flotilla Leading',
                'instruction' => 'Sailing Instruction',
                'delivery' => 'Yacht Delivery'
            );
            $destinations = array(
                'greece' => 'Greece',
                'bvi' => 'British Virgin Islands',
                'croatia' => 'Croatia',
                'italy' => 'Italy',
                'spain' => 'Spain',
                'turkey' => 'Turkey',
                'other' => 'Other'
            );
            
            $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;
            $destination_display = isset($destinations[$destination]) ? $destinations[$destination] : $destination;
            
            // Get booking status
            $status_terms = get_the_terms($booking_id, 'booking_status');
            $status_display = $status_terms ? $status_terms[0]->name : ($booking_status ?: 'No status');
            
            echo '<div class="booking-item">';
            echo '<h3>' . esc_html($service_display) . ' in ' . esc_html($destination_display) . '</h3>';
            echo '<p>Date: ' . date('F j, Y', strtotime($start_date)) . '</p>';
            echo '<p>Status: ' . esc_html(ucfirst($status_display)) . '</p>';
            
            // Show tip options for completed bookings
            $is_past = strtotime($start_date) < current_time('timestamp');
            $is_completed = $booking_status === 'completed';
            $tip_paid = get_post_meta($booking_id, '_booking_tip_paid', true) === 'yes';
            
            if ($is_past && $is_completed && $payment_status === 'paid') {
                if ($tip_paid) {
                    echo '<p class="tip-status success">Tip sent - Thank you!</p>';
                } else {
                    $employee_id = get_post_meta($booking_id, '_booking_employee_id', true);
                    $tip_requested = get_post_meta($booking_id, '_booking_tip_requested', true) === 'yes';
                    
                    if ($tip_requested) {
                        $tip_token = get_post_meta($booking_id, '_booking_tip_token', true);
                        $tip_link = site_url('tip-payment/?token=' . $tip_token);
                        
                        echo '<p class="tip-status">Crew has requested a tip - <a href="' . esc_url($tip_link) . '" class="button tip-button">Leave a Tip</a></p>';
                    }
                }
            }
            
            echo '<p><a href="?booking_id=' . esc_attr($booking_id) . '" class="button view-details">View Details</a></p>';
            echo '</div>';
        }
        echo '</div>';
    } else {
        echo '<p>No bookings found.</p>';
    }
    
    $html = ob_get_clean();
    wp_send_json_success($html);
}
add_action('wp_ajax_captain_get_client_bookings', 'captain_get_client_bookings');

// Ajax handler for client contracts
function captain_get_client_contracts() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    $client_id = isset($_POST['client_id']) ? intval($_POST['client_id']) : 0;
    
    if (!$client_id) {
        wp_send_json_error('Invalid client ID');
        return;
    }
    
    // Get all bookings for this client
    $bookings = get_posts(array(
        'post_type' => 'booking',
        'posts_per_page' => -1,
        'meta_key' => '_booking_client_id',
        'meta_value' => $client_id
    ));
    
    ob_start();
    if ($bookings) {
        $has_contracts = false;
        echo '<div class="contracts-list">';
        
        foreach ($bookings as $booking) {
            $booking_id = $booking->ID;
            $contract = get_post_meta($booking_id, '_booking_contract', true);
            $contract_status = get_post_meta($booking_id, '_booking_contract_status', true);
            
            if (!empty($contract)) {
                $has_contracts = true;
                $service_type = get_post_meta($booking_id, '_booking_service_type', true);
                $start_date = get_post_meta($booking_id, '_booking_start_date', true);
                
                // Format service type
                $service_types = array(
                    'charter' => 'Private Charter',
                    'flotilla' => 'Flotilla Leading',
                    'instruction' => 'Sailing Instruction',
                    'delivery' => 'Yacht Delivery'
                );
                $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;
                
                echo '<div class="contract-item">';
                echo '<h3>Contract for ' . esc_html($service_display) . ' (' . date('F j, Y', strtotime($start_date)) . ')</h3>';
                echo '<p>Status: ' . esc_html(ucfirst($contract_status ?: 'Draft')) . '</p>';
                echo '<p><a href="?booking_id=' . esc_attr($booking_id) . '&view_contract=1" class="button view-contract">View Contract</a></p>';
                echo '</div>';
            }
        }
        
        echo '</div>';
        
        if (!$has_contracts) {
            echo '<p>No contracts available yet.</p>';
        }
    } else {
        echo '<p>No bookings or contracts found.</p>';
    }
    
    $html = ob_get_clean();
    wp_send_json_success($html);
}
add_action('wp_ajax_captain_get_client_contracts', 'captain_get_client_contracts');

// Ajax handler for client payments
function captain_get_client_payments() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    $client_id = isset($_POST['client_id']) ? intval($_POST['client_id']) : 0;
    
    if (!$client_id) {
        wp_send_json_error('Invalid client ID');
        return;
    }
    
    // Get all bookings for this client
    $bookings = get_posts(array(
        'post_type' => 'booking',
        'posts_per_page' => -1,
        'meta_key' => '_booking_client_id',
        'meta_value' => $client_id
    ));
    
    ob_start();
    if ($bookings) {
        $has_payments = false;
        echo '<div class="payments-list">';
        
        foreach ($bookings as $booking) {
            $booking_id = $booking->ID;
            $payment_status = get_post_meta($booking_id, '_booking_payment_status', true);
            $price = get_post_meta($booking_id, '_booking_price', true);
            
            if (!empty($payment_status) || !empty($price)) {
                $has_payments = true;
                $service_type = get_post_meta($booking_id, '_booking_service_type', true);
                $start_date = get_post_meta($booking_id, '_booking_start_date', true);
                $tip_amount = get_post_meta($booking_id, '_booking_tip_amount', true) ?: 0;
                
                // Format service type
                $service_types = array(
                    'charter' => 'Private Charter',
                    'flotilla' => 'Flotilla Leading',
                    'instruction' => 'Sailing Instruction',
                    'delivery' => 'Yacht Delivery'
                );
                $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;
                
                echo '<div class="payment-item">';
                echo '<h3>' . esc_html($service_display) . ' (' . date('F j, Y', strtotime($start_date)) . ')</h3>';
                echo '<p>Service Amount: €' . number_format($price, 2) . '</p>';
                
                if ($tip_amount > 0) {
                    echo '<p>Tip Amount: €' . number_format($tip_amount, 2) . '</p>';
                    echo '<p>Total Amount: €' . number_format($price + $tip_amount, 2) . '</p>';
                }
                
                echo '<p>Status: ' . esc_html(ucfirst($payment_status ?: 'Pending')) . '</p>';
                echo '<p><a href="?booking_id=' . esc_attr($booking_id) . '" class="button view-payment">View Details</a></p>';
                echo '</div>';
            }
        }
        
        echo '</div>';
        
        if (!$has_payments) {
            echo '<p>No payment records found.</p>';
        }
    } else {
        echo '<p>No bookings or payment records found.</p>';
    }
    
    $html = ob_get_clean();
    wp_send_json_success($html);
}
add_action('wp_ajax_captain_get_client_payments', 'captain_get_client_payments');

// Ajax handler for client profile
function captain_get_client_profile() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    $client_id = isset($_POST['client_id']) ? intval($_POST['client_id']) : 0;
    
    if (!$client_id) {
        wp_send_json_error('Invalid client ID');
        return;
    }
    
    $client = get_post($client_id);
    
    if (!$client) {
        wp_send_json_error('Client not found');
        return;
    }
    
    $email = get_post_meta($client_id, '_client_email', true);
    $phone = get_post_meta($client_id, '_client_phone', true);
    $nationality = get_post_meta($client_id, '_client_nationality', true);
    $experience = get_post_meta($client_id, '_client_sailing_experience', true);
    
    // Get client rank information
    $rating = get_post_meta($client_id, '_client_rating', true) ?: 5;
    $cancellations = get_post_meta($client_id, '_client_cancellations', true) ?: 0;
    
    // Format sailing experience
    $experience_labels = array(
        'none' => 'None',
        'beginner' => 'Beginner',
        'intermediate' => 'Intermediate',
        'advanced' => 'Advanced',
        'expert' => 'Expert'
    );
    $experience_display = isset($experience_labels[$experience]) ? $experience_labels[$experience] : $experience;
    
    ob_start();
    ?>
    <div class="client-profile">
        <h3>Personal Information</h3>
        <div class="profile-info">
            <p><strong>Name:</strong> <?php echo esc_html($client->post_title); ?></p>
            <p><strong>Email:</strong> <?php echo esc_html($email); ?></p>
            <p><strong>Phone:</strong> <?php echo esc_html($phone); ?></p>
            <p><strong>Nationality:</strong> <?php echo esc_html($nationality); ?></p>
            <p><strong>Sailing Experience:</strong> <?php echo esc_html($experience_display); ?></p>
        </div>
        
        <?php
        // Display client rank
        if (function_exists('captain_display_client_rank')) {
            echo captain_display_client_rank($client_id);
        }
        ?>
        
        <div class="profile-actions">
            <button type="button" class="button edit-profile">Edit Profile</button>
        </div>
        
        <div class="profile-edit-form" style="display:none;">
            <h3>Edit Profile</h3>
            <form id="update-client-profile" class="update-profile-form">
                <div class="form-field">
                    <label for="client_phone">Phone:</label>
                    <input type="text" id="client_phone" name="client_phone" value="<?php echo esc_attr($phone); ?>">
                </div>
                
                <div class="form-field">
                    <label for="client_nationality">Nationality:</label>
                    <input type="text" id="client_nationality" name="client_nationality" value="<?php echo esc_attr($nationality); ?>">
                </div>
                
                <div class="form-field">
                    <label for="client_experience">Sailing Experience:</label>
                    <select id="client_experience" name="client_experience">
                        <?php foreach ($experience_labels as $key => $label): ?>
                            <option value="<?php echo esc_attr($key); ?>" <?php selected($experience, $key); ?>><?php echo esc_html($label); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <input type="hidden" name="client_id" value="<?php echo esc_attr($client_id); ?>">
                <?php wp_nonce_field('update_client_profile', 'profile_nonce'); ?>
                
                <button type="submit" class="button update-button">Update Profile</button>
                <button type="button" class="button cancel-button">Cancel</button>
            </form>
            <div id="profile-update-message"></div>
        </div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        $('.edit-profile').on('click', function() {
            $('.profile-info, .profile-actions, .rank-display').hide();
            $('.profile-edit-form').show();
        });
        
        $('.cancel-button').on('click', function() {
            $('.profile-edit-form').hide();
            $('.profile-info, .profile-actions, .rank-display').show();
        });
        
        $('#update-client-profile').on('submit', function(e) {
            e.preventDefault();
            var formData = $(this).serialize();
            
            $.ajax({
                url: captain_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'captain_update_client_profile',
                    formData: formData,
                    nonce: captain_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        $('#profile-update-message').html('<p class="success">' + response.data + '</p>');
                        setTimeout(function() {
                            location.reload();
                        }, 1500);
                    } else {
                        $('#profile-update-message').html('<p class="error">' + response.data + '</p>');
                    }
                },
                error: function() {
                    $('#profile-update-message').html('<p class="error">An error occurred. Please try again.</p>');
                }
            });
        });
    });
    </script>
    <?php
    $html = ob_get_clean();
    wp_send_json_success($html);
}
add_action('wp_ajax_captain_get_client_profile', 'captain_get_client_profile');

// Ajax handler for client profile update
function captain_update_client_profile() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    // Parse form data
    parse_str($_POST['formData'], $form_data);
    
    if (!isset($form_data['client_id']) || !wp_verify_nonce($form_data['profile_nonce'], 'update_client_profile')) {
        wp_send_json_error('Invalid form data');
        return;
    }
    
    $client_id = intval($form_data['client_id']);
    
    // Verify current user has permission
    $current_user = wp_get_current_user();
    $client_email = get_post_meta($client_id, '_client_email', true);
    
    if (!current_user_can('manage_options') && $current_user->user_email !== $client_email) {
        wp_send_json_error('You do not have permission to update this profile');
        return;
    }
    
    // Update client data
    if (isset($form_data['client_phone'])) {
        update_post_meta($client_id, '_client_phone', sanitize_text_field($form_data['client_phone']));
    }
    
    if (isset($form_data['client_nationality'])) {
        update_post_meta($client_id, '_client_nationality', sanitize_text_field($form_data['client_nationality']));
    }
    
    if (isset($form_data['client_experience'])) {
        update_post_meta($client_id, '_client_sailing_experience', sanitize_text_field($form_data['client_experience']));
    }
    
    wp_send_json_success('Profile updated successfully!');
}
add_action('wp_ajax_captain_update_client_profile', 'captain_update_client_profile');

// Employee dashboard AJAX handlers
function captain_get_employee_bookings() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    $status = isset($_POST['status']) ? sanitize_text_field($_POST['status']) : 'all';
    
    // Get employee ID if available
    $employee_id = isset($_POST['employee_id']) ? intval($_POST['employee_id']) : 0;
    
    // If no employee ID, try to get from current user
    if (!$employee_id) {
        $current_user = wp_get_current_user();
        
        // Query employees by email
        $employees = get_posts(array(
            'post_type' => 'employee',
            'posts_per_page' => 1,
            'meta_key' => '_employee_email',
            'meta_value' => $current_user->user_email,
            'meta_compare' => '='
        ));
        
        if (!empty($employees)) {
            $employee_id = $employees[0]->ID;
        }
    }
    
    // Build query arguments
    $args = array(
        'post_type' => 'booking',
        'posts_per_page' => -1,
        'post_status' => 'publish'
    );
    
    // Filter by employee if we have an ID
    if ($employee_id) {
        $args['meta_query'] = array(
            array(
                'key' => '_booking_employee_id',
                'value' => $employee_id
            )
        );
    }
    
    // Add date filtering if status is 'upcoming' or 'past'
    if ($status == 'upcoming' || $status == 'past') {
        $today = date('Y-m-d');
        
        if (isset($args['meta_query'])) {
            $args['meta_query'][] = array(
                'key' => '_booking_start_date',
                'value' => $today,
                'compare' => $status == 'upcoming' ? '>=' : '<',
                'type' => 'DATE'
            );
        } else {
            $args['meta_query'] = array(
                array(
                    'key' => '_booking_start_date',
                    'value' => $today,
                    'compare' => $status == 'upcoming' ? '>=' : '<',
                    'type' => 'DATE'
                )
            );
        }
    }
    
    // If user is admin, show all bookings if no employee ID
    if (!$employee_id && current_user_can('manage_options')) {
        // Remove any employee filter
        unset($args['meta_query']['_booking_employee_id']);
    } elseif (!$employee_id && !current_user_can('manage_options')) {
        // Non-admin users without employee association can't see bookings
        wp_send_json_error('No employee profile found for your account');
        return;
    }
    
    $bookings = get_posts($args);
    
    ob_start();
    if ($bookings) {
        echo '<div class="assignments-list">';
        foreach ($bookings as $booking) {
            $booking_id = $booking->ID;
            $service_type = get_post_meta($booking_id, '_booking_service_type', true);
            $start_date = get_post_meta($booking_id, '_booking_start_date', true);
            $end_date = get_post_meta($booking_id, '_booking_end_date', true);
            $destination = get_post_meta($booking_id, '_booking_destination', true);
            $booking_status = get_post_meta($booking_id, '_booking_status', true);
            $payment_status = get_post_meta($booking_id, '_booking_payment_status', true);
            $tip_requested = get_post_meta($booking_id, '_booking_tip_requested', true);
            $tip_paid = get_post_meta($booking_id, '_booking_tip_paid', true);
            
            // Get client info
            $client_id = get_post_meta($booking_id, '_booking_client_id', true);
            $client_name = get_the_title($client_id);
            
            // Format the data
            $service_types = array(
                'charter' => 'Private Charter',
                'flotilla' => 'Flotilla Leading',
                'instruction' => 'Sailing Instruction',
                'delivery' => 'Yacht Delivery'
            );
            $destinations = array(
                'greece' => 'Greece',
                'bvi' => 'British Virgin Islands',
                'croatia' => 'Croatia',
                'italy' => 'Italy',
                'spain' => 'Spain',
                'turkey' => 'Turkey',
                'other' => 'Other'
            );
            
            $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;
            $destination_display = isset($destinations[$destination]) ? $destinations[$destination] : $destination;
            
            echo '<div class="assignment-item">';
            echo '<h3>' . esc_html($service_display) . ' in ' . esc_html($destination_display) . '</h3>';
            echo '<p><strong>Client:</strong> ' . esc_html($client_name) . '</p>';
            echo '<p><strong>Date:</strong> ' . date('F j, Y', strtotime($start_date));
            if (!empty($end_date)) {
                echo ' to ' . date('F j, Y', strtotime($end_date));
            }
            echo '</p>';
            
            // For past services that have been paid and completed
            $is_past = strtotime($end_date) < current_time('timestamp');
            $is_paid = $payment_status === 'paid';
            $is_completed = $booking_status === 'completed';
            
            if ($is_past && $is_paid && $is_completed) {
                if ($tip_paid == 'yes') {
                    echo '<p class="tip-status success">Tip received - Thank you!</p>';
                } elseif ($tip_requested == 'yes') {
                    echo '<p class="tip-status pending">Tip requested - Awaiting payment</p>';
                    echo '<button type="button" class="copy-tip-link" data-booking="' . esc_attr($booking_id) . '">Copy Tip Link</button>';
                } else {
                    echo '<button type="button" class="request-tip-btn" data-booking="' . esc_attr($booking_id) . '" data-client="' . esc_attr($client_id) . '">Request Tip</button>';
                }
            }
            
            echo '<p><a href="?booking_id=' . esc_attr($booking_id) . '" class="button view-assignment">View Details</a></p>';
            echo '</div>';
        }
        echo '</div>';
    } else {
        echo '<p>No assignments found.</p>';
    }
    
    $html = ob_get_clean();
    wp_send_json_success($html);
}
add_action('wp_ajax_captain_get_employee_bookings', 'captain_get_employee_bookings');

// Employee payments handler
function captain_get_employee_payments() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    // Get employee ID if available
    $employee_id = isset($_POST['employee_id']) ? intval($_POST['employee_id']) : 0;
    
    // If no employee ID, try to get from current user
    if (!$employee_id) {
        $current_user = wp_get_current_user();
        
        // Query employees by email
        $employees = get_posts(array(
            'post_type' => 'employee',
            'posts_per_page' => 1,
            'meta_key' => '_employee_email',
            'meta_value' => $current_user->user_email,
            'meta_compare' => '='
        ));
        
        if (!empty($employees)) {
            $employee_id = $employees[0]->ID;
        }
    }
    
    // Get bookings for this employee
    $args = array(
        'post_type' => 'booking',
        'posts_per_page' => -1,
        'post_status' => 'publish'
    );
    
    // Filter by employee if we have an ID
    if ($employee_id) {
        $args['meta_query'] = array(
            array(
                'key' => '_booking_employee_id',
                'value' => $employee_id
            )
        );
    }
    
    $bookings = get_posts($args);
    
    ob_start();
    if ($bookings) {
        echo '<div class="payment-history">';
        
        $total_earnings = 0;
        $total_tips = 0;
        
        foreach ($bookings as $booking) {
            $booking_id = $booking->ID;
            $payment_status = get_post_meta($booking_id, '_booking_payment_status', true);
            $booking_status = get_post_meta($booking_id, '_booking_status', true);
            $price = get_post_meta($booking_id, '_booking_price', true);
            $tip_amount = get_post_meta($booking_id, '_booking_tip_amount', true) ?: 0;
            
            // Only show completed and paid bookings
            if ($payment_status === 'paid' && $booking_status === 'completed') {
                $service_type = get_post_meta($booking_id, '_booking_service_type', true);
                $start_date = get_post_meta($booking_id, '_booking_start_date', true);
                $client_id = get_post_meta($booking_id, '_booking_client_id', true);
                $client_name = get_the_title($client_id);
                
                // Format service type
                $service_types = array(
                    'charter' => 'Private Charter',
                    'flotilla' => 'Flotilla Leading',
                    'instruction' => 'Sailing Instruction',
                    'delivery' => 'Yacht Delivery'
                );
                $service_display = isset($service_types[$service_type]) ? $service_types[$service_type] : $service_type;
                
                // Calculate earnings (example: 70% of booking price)
                $commission_rate = 0.7; // 70% goes to employee
                $earnings = $price * $commission_rate;
                $total_earnings += $earnings;
                $total_tips += $tip_amount;
                
                echo '<div class="payment-item">';
                echo '<h3>' . esc_html($service_display) . ' - ' . date('F j, Y', strtotime($start_date)) . '</h3>';
                echo '<p><strong>Client:</strong> ' . esc_html($client_name) . '</p>';
                echo '<p><strong>Service Fee:</strong> €' . number_format($price, 2) . '</p>';
                echo '<p><strong>Your Earnings:</strong> €' . number_format($earnings, 2) . '</p>';
                
                if ($tip_amount > 0) {
                    echo '<p><strong>Tip Received:</strong> €' . number_format($tip_amount, 2) . '</p>';
                }
                
                echo '<p><strong>Status:</strong> Paid</p>';
                echo '</div>';
            }
        }
        
        // Show earnings summary
        echo '<div class="earnings-summary">';
        echo '<h3>Earnings Summary</h3>';
        echo '<p><strong>Total Service Earnings:</strong> €' . number_format($total_earnings, 2) . '</p>';
        echo '<p><strong>Total Tips:</strong> €' . number_format($total_tips, 2) . '</p>';
        echo '<p><strong>Grand Total:</strong> €' . number_format($total_earnings + $total_tips, 2) . '</p>';
        echo '</div>';
        
        echo '</div>';
    } else {
        echo '<p>No payment records found.</p>';
    }
    
    $html = ob_get_clean();
    wp_send_json_success($html);
}
add_action('wp_ajax_captain_get_employee_payments', 'captain_get_employee_payments');

// Employee profile handler
function captain_get_employee_profile() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    // Get employee ID if available
    $employee_id = isset($_POST['employee_id']) ? intval($_POST['employee_id']) : 0;
    
    // If no employee ID, try to get from current user
    if (!$employee_id) {
        $current_user = wp_get_current_user();
        
        // Query employees by email
        $employees = get_posts(array(
            'post_type' => 'employee',
            'posts_per_page' => 1,
            'meta_key' => '_employee_email',
            'meta_value' => $current_user->user_email,
            'meta_compare' => '='
        ));
        
        if (!empty($employees)) {
            $employee_id = $employees[0]->ID;
        }
    }
    
    // Get employee info
    $employee = null;
    if ($employee_id) {
        $employee = get_post($employee_id);
    }
    
    ob_start();
    
    if ($employee) {
        $email = get_post_meta($employee_id, '_employee_email', true);
        $phone = get_post_meta($employee_id, '_employee_phone', true);
        $position = get_post_meta($employee_id, '_employee_position', true);
        $qualifications = get_post_meta($employee_id, '_employee_qualifications', true);
        
        // Get employee rank data
        $rating = get_post_meta($employee_id, '_employee_rating', true) ?: 5;
        $completed_jobs = get_post_meta($employee_id, '_employee_completed_jobs', true) ?: 0;
        $review_score = get_post_meta($employee_id, '_employee_review_score', true) ?: 0;
        
        ?>
        <div class="employee-profile">
            <h3>Personal Information</h3>
            <div class="profile-info">
                <p><strong>Name:</strong> <?php echo esc_html($employee->post_title); ?></p>
                <p><strong>Email:</strong> <?php echo esc_html($email); ?></p>
                <p><strong>Phone:</strong> <?php echo esc_html($phone); ?></p>
                <p><strong>Position:</strong> <?php echo esc_html($position); ?></p>
                
                <?php if ($qualifications): ?>
                <div class="qualifications">
                    <h4>Qualifications</h4>
                    <?php echo wpautop(esc_html($qualifications)); ?>
                </div>
                <?php endif; ?>
            </div>
            
            <?php
            // Display employee rank
            if (function_exists('captain_display_employee_rank')) {
                echo captain_display_employee_rank($employee_id);
            }
            ?>
            
            <div class="profile-actions">
                <button type="button" class="button edit-profile">Edit Profile</button>
            </div>
            
            <div class="profile-edit-form" style="display:none;">
                <h3>Edit Profile</h3>
                <form id="update-employee-profile" class="update-profile-form">
                    <div class="form-field">
                        <label for="employee_phone">Phone:</label>
                        <input type="text" id="employee_phone" name="employee_phone" value="<?php echo esc_attr($phone); ?>">
                    </div>
                    
                    <div class="form-field">
                        <label for="employee_qualifications">Qualifications:</label>
                        <textarea id="employee_qualifications" name="employee_qualifications" rows="4"><?php echo esc_textarea($qualifications); ?></textarea>
                    </div>
                    
                    <input type="hidden" name="employee_id" value="<?php echo esc_attr($employee_id); ?>">
                    <?php wp_nonce_field('update_employee_profile', 'profile_nonce'); ?>
                    
                    <button type="submit" class="button update-button">Update Profile</button>
                    <button type="button" class="button cancel-button">Cancel</button>
                </form>
                <div id="profile-update-message"></div>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('.edit-profile').on('click', function() {
                $('.profile-info, .profile-actions, .rank-display').hide();
                $('.profile-edit-form').show();
            });
            
            $('.cancel-button').on('click', function() {
                $('.profile-edit-form').hide();
                $('.profile-info, .profile-actions, .rank-display').show();
            });
            
            $('#update-employee-profile').on('submit', function(e) {
                e.preventDefault();
                var formData = $(this).serialize();
                
                $.ajax({
                    url: captain_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'captain_update_employee_profile',
                        formData: formData,
                        nonce: captain_ajax.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            $('#profile-update-message').html('<p class="success">' + response.data + '</p>');
                            setTimeout(function() {
                                location.reload();
                            }, 1500);
                        } else {
                            $('#profile-update-message').html('<p class="error">' + response.data + '</p>');
                        }
                    },
                    error: function() {
                        $('#profile-update-message').html('<p class="error">An error occurred. Please try again.</p>');
                    }
                });
            });
        });
        </script>
        <?php
    } else {
        // No employee profile found
        $current_user = wp_get_current_user();
        ?>
        <div class="employee-profile">
            <h3>Personal Information</h3>
            <div class="profile-info">
                <p><strong>Name:</strong> <?php echo esc_html($current_user->display_name); ?></p>
                <p><strong>Email:</strong> <?php echo esc_html($current_user->user_email); ?></p>
                <p><strong>Role:</strong> <?php echo esc_html(ucfirst($current_user->roles[0])); ?></p>
            </div>
            
            <div class="missing-profile-notice">
                <p>No employee profile has been created for your account. Please contact the administrator.</p>
            </div>
        </div>
        <?php
    }
    
    $html = ob_get_clean();
    wp_send_json_success($html);
}
add_action('wp_ajax_captain_get_employee_profile', 'captain_get_employee_profile');

// Employee profile update handler
function captain_update_employee_profile() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    // Parse form data
    parse_str($_POST['formData'], $form_data);
    
    if (!isset($form_data['employee_id']) || !wp_verify_nonce($form_data['profile_nonce'], 'update_employee_profile')) {
        wp_send_json_error('Invalid form data');
        return;
    }
    
    $employee_id = intval($form_data['employee_id']);
    
    // Verify current user has permission
    $current_user = wp_get_current_user();
    $employee_email = get_post_meta($employee_id, '_employee_email', true);
    
    if (!current_user_can('manage_options') && $current_user->user_email !== $employee_email) {
        wp_send_json_error('You do not have permission to update this profile');
        return;
    }
    
    // Update employee data
    if (isset($form_data['employee_phone'])) {
        update_post_meta($employee_id, '_employee_phone', sanitize_text_field($form_data['employee_phone']));
    }
    
    if (isset($form_data['employee_qualifications'])) {
        update_post_meta($employee_id, '_employee_qualifications', sanitize_textarea_field($form_data['employee_qualifications']));
    }
    
    wp_send_json_success('Profile updated successfully!');
}
add_action('wp_ajax_captain_update_employee_profile', 'captain_update_employee_profile');

function captain_add_employer_dashboard_tabs($tabs) {
    // Check if user is an employer
    if (captain_user_can_add_employees()) {
        $tabs['employees'] = array(
            'title' => 'Employees',
            'callback' => 'captain_render_employees_tab'
        );
    }

    return $tabs;
}

function captain_render_employees_tab() {
    echo do_shortcode('[captain_employee_management]');
}

// You'd also need a helper function
function captain_user_can_add_employees() {
    // Logic to check if user can add employees
    return current_user_can('manage_options') || get_user_meta(get_current_user_id(), '_captain_is_employer', true);
}