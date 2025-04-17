<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Add rating meta box for clients and employees
function captain_add_rating_meta_boxes() {
    add_meta_box(
        'client_rating_metabox',
        'Client Rating',
        'captain_client_rating_callback',
        'client',
        'side',
        'default'
    );
    
    add_meta_box(
        'employee_rating_metabox',
        'Employee Rating',
        'captain_employee_rating_callback',
        'employee',
        'side',
        'default'
    );
}
add_action('add_meta_boxes', 'captain_add_rating_meta_boxes');

// Client rating meta box callback
function captain_client_rating_callback($post) {
    // Get current rating
    $rating = get_post_meta($post->ID, '_client_rating', true) ?: 5;
    $cancellations = get_post_meta($post->ID, '_client_cancellations', true) ?: 0;
    
    // Calculate rank based on rating and cancellations
    $rank = captain_calculate_client_rank($rating, $cancellations);
    
    wp_nonce_field('captain_rating_nonce', 'rating_nonce');
    ?>
    <div class="rating-metabox">
        <p>
            <label for="client_rating">Rating (1-10):</label>
            <input type="number" id="client_rating" name="client_rating" min="1" max="10" value="<?php echo esc_attr($rating); ?>" style="width: 70px;">
        </p>
        
        <p>
            <label for="client_cancellations">Cancellations:</label>
            <input type="number" id="client_cancellations" name="client_cancellations" min="0" value="<?php echo esc_attr($cancellations); ?>" style="width: 70px;">
        </p>
        
        <p><strong>Client Rank:</strong> <span class="rank-badge rank-<?php echo esc_attr(strtolower($rank)); ?>"><?php echo esc_html($rank); ?></span></p>
        
        <p class="description">Rank is calculated based on rating and number of cancellations.</p>
    </div>
    
    <style>
    .rank-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 3px;
        color: white;
        font-weight: bold;
    }
    .rank-gold { background-color: #FFD700; color: #000; }
    .rank-silver { background-color: #C0C0C0; color: #000; }
    .rank-bronze { background-color: #CD7F32; }
    .rank-standard { background-color: #6c757d; }
    </style>
    <?php
}

// Employee rating meta box callback
function captain_employee_rating_callback($post) {
    // Get current rating
    $rating = get_post_meta($post->ID, '_employee_rating', true) ?: 5;
    $completed_jobs = get_post_meta($post->ID, '_employee_completed_jobs', true) ?: 0;
    $review_score = get_post_meta($post->ID, '_employee_review_score', true) ?: 0;
    
    // Calculate rank based on rating, completed jobs, and review score
    $rank = captain_calculate_employee_rank($rating, $completed_jobs, $review_score);
    
    wp_nonce_field('captain_rating_nonce', 'rating_nonce');
    ?>
    <div class="rating-metabox">
        <p>
            <label for="employee_rating">Admin Rating (1-10):</label>
            <input type="number" id="employee_rating" name="employee_rating" min="1" max="10" value="<?php echo esc_attr($rating); ?>" style="width: 70px;">
        </p>
        
        <p>
            <label for="employee_completed_jobs">Completed Jobs:</label>
            <input type="number" id="employee_completed_jobs" name="employee_completed_jobs" min="0" value="<?php echo esc_attr($completed_jobs); ?>" style="width: 70px;">
        </p>
        
        <p>
            <label for="employee_review_score">Client Review Score (1-5):</label>
            <input type="number" id="employee_review_score" name="employee_review_score" min="1" max="5" step="0.1" value="<?php echo esc_attr($review_score); ?>" style="width: 70px;">
        </p>
        
        <p><strong>Employee Rank:</strong> <span class="rank-badge rank-<?php echo esc_attr(strtolower($rank)); ?>"><?php echo esc_html($rank); ?></span></p>
        
        <p class="description">Rank is calculated based on admin rating, completed jobs, and client reviews.</p>
    </div>
    <?php
}

// Save rating meta box data
function captain_save_rating_meta($post_id) {
    // Check if nonce is set
    if (!isset($_POST['rating_nonce'])) {
        return;
    }
    
    // Verify nonce
    if (!wp_verify_nonce($_POST['rating_nonce'], 'captain_rating_nonce')) {
        return;
    }
    
    // If this is an autosave, don't do anything
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    // Check the user's permissions
    if (isset($_POST['post_type']) && 'client' === $_POST['post_type']) {
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Save client rating data
        if (isset($_POST['client_rating'])) {
            $rating = intval($_POST['client_rating']);
            if ($rating < 1) $rating = 1;
            if ($rating > 10) $rating = 10;
            update_post_meta($post_id, '_client_rating', $rating);
        }
        
        if (isset($_POST['client_cancellations'])) {
            $cancellations = intval($_POST['client_cancellations']);
            if ($cancellations < 0) $cancellations = 0;
            update_post_meta($post_id, '_client_cancellations', $cancellations);
        }
    }
    
    // For employees
    if (isset($_POST['post_type']) && 'employee' === $_POST['post_type']) {
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Save employee rating data
        if (isset($_POST['employee_rating'])) {
            $rating = intval($_POST['employee_rating']);
            if ($rating < 1) $rating = 1;
            if ($rating > 10) $rating = 10;
            update_post_meta($post_id, '_employee_rating', $rating);
        }
        
        if (isset($_POST['employee_completed_jobs'])) {
            $completed_jobs = intval($_POST['employee_completed_jobs']);
            if ($completed_jobs < 0) $completed_jobs = 0;
            update_post_meta($post_id, '_employee_completed_jobs', $completed_jobs);
        }
        
        if (isset($_POST['employee_review_score'])) {
            $review_score = floatval($_POST['employee_review_score']);
            if ($review_score < 1) $review_score = 1;
            if ($review_score > 5) $review_score = 5;
            update_post_meta($post_id, '_employee_review_score', $review_score);
        }
    }
}
add_action('save_post', 'captain_save_rating_meta');

// Calculate client rank
function captain_calculate_client_rank($rating, $cancellations) {
    // Apply penalties for cancellations
    $adjusted_rating = max(1, $rating - ($cancellations * 0.5));
    
    // Determine rank based on adjusted rating
    if ($adjusted_rating >= 8.5) {
        return 'Gold';
    } elseif ($adjusted_rating >= 7) {
        return 'Silver';
    } elseif ($adjusted_rating >= 5) {
        return 'Bronze';
    } else {
        return 'Standard';
    }
}

// Calculate employee rank
function captain_calculate_employee_rank($admin_rating, $completed_jobs, $review_score) {
    // Weight factors for calculation
    $admin_weight = 0.4;
    $jobs_weight = 0.2;
    $review_weight = 0.4;
    
    // Normalize job count (more is better, capped at 50 for calculation)
    $job_factor = min($completed_jobs, 50) / 50 * 10;

    // Convert review score from 5-point to 10-point scale
    $review_factor = $review_score * 2;

    // Calculate composite score
    $composite_score = ($admin_rating * $admin_weight) +
                      ($job_factor * $jobs_weight) +
                      ($review_factor * $review_weight);

    // Determine rank based on composite score
    if ($composite_score >= 8.5) {
        return 'Gold';
    } elseif ($composite_score >= 7) {
        return 'Silver';
    } elseif ($composite_score >= 5) {
        return 'Bronze';
    } else {
        return 'Standard';
    }
}

// Add a meta box for booking ratings
function captain_add_booking_rating_meta_box() {
    add_meta_box(
        'booking_rating_metabox',
        'Client Rating',
        'captain_booking_rating_callback',
        'booking',
        'side',
        'default'
    );
}
add_action('add_meta_boxes', 'captain_add_booking_rating_meta_box');

// Booking rating meta box callback
function captain_booking_rating_callback($post) {
    $rating = get_post_meta($post->ID, '_booking_client_rating', true);
    $rating_comment = get_post_meta($post->ID, '_booking_client_rating_comment', true);
    $employee_id = get_post_meta($post->ID, '_booking_employee_id', true);

    wp_nonce_field('captain_booking_rating_nonce', 'booking_rating_nonce');
    ?>
    <div class="rating-metabox">
        <p>
            <label for="booking_client_rating">Rating (1-5 stars):</label>
            <select id="booking_client_rating" name="booking_client_rating">
                <option value="">Not rated</option>
                <?php for ($i = 1; $i <= 5; $i++): ?>
                    <option value="<?php echo $i; ?>" <?php selected($rating, $i); ?>><?php echo str_repeat('★', $i) . str_repeat('☆', 5 - $i); ?></option>
                <?php endfor; ?>
            </select>
        </p>

        <p>
            <label for="booking_client_rating_comment">Comment:</label>
            <textarea id="booking_client_rating_comment" name="booking_client_rating_comment" rows="3" style="width: 100%;"><?php echo esc_textarea($rating_comment); ?></textarea>
        </p>

        <?php if ($employee_id): ?>
            <p>
                <label for="booking_employee_id">Assigned Employee:</label>
                <select id="booking_employee_id" name="booking_employee_id">
                    <option value="">Select Employee</option>
                    <?php
                    // Query employees (adapt based on how you store employee data)
                    $employees = get_posts(array(
                        'post_type' => 'employee',
                        'posts_per_page' => -1,
                        'orderby' => 'title',
                        'order' => 'ASC'
                    ));

                    foreach ($employees as $employee) {
                        echo '<option value="' . esc_attr($employee->ID) . '" ' . selected($employee_id, $employee->ID, false) . '>' . esc_html($employee->post_title) . '</option>';
                    }
                    ?>
                </select>
            </p>
        <?php endif; ?>
    </div>
    <?php
}

// Save booking rating data
function captain_save_booking_rating($post_id) {
    // Check if nonce is set
    if (!isset($_POST['booking_rating_nonce'])) {
        return;
    }

    // Verify nonce
    if (!wp_verify_nonce($_POST['booking_rating_nonce'], 'captain_booking_rating_nonce')) {
        return;
    }

    // If this is an autosave, don't do anything
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }

    // Check the user's permissions
    if ('booking' === $_POST['post_type'] && !current_user_can('edit_post', $post_id)) {
        return;
    }

    // Save rating data
    if (isset($_POST['booking_client_rating'])) {
        $old_rating = get_post_meta($post_id, '_booking_client_rating', true);
        $new_rating = sanitize_text_field($_POST['booking_client_rating']);

        update_post_meta($post_id, '_booking_client_rating', $new_rating);

        // If this is a new rating, update employee stats
        if ($old_rating !== $new_rating && !empty($new_rating)) {
            $employee_id = isset($_POST['booking_employee_id']) ? intval($_POST['booking_employee_id']) : 0;

            if ($employee_id) {
                // Update employee review score (average of all ratings)
                captain_update_employee_review_score($employee_id);

                // Increment completed jobs counter if not already done
                $completed_jobs = get_post_meta($employee_id, '_employee_completed_jobs', true) ?: 0;
                if (intval($completed_jobs) === 0) {
                    update_post_meta($employee_id, '_employee_completed_jobs', 1);
                } else {
                    $completed_jobs++;
                    update_post_meta($employee_id, '_employee_completed_jobs', $completed_jobs);
                }
            }
        }
    }

    if (isset($_POST['booking_client_rating_comment'])) {
        update_post_meta($post_id, '_booking_client_rating_comment', sanitize_textarea_field($_POST['booking_client_rating_comment']));
    }

    if (isset($_POST['booking_employee_id'])) {
        update_post_meta($post_id, '_booking_employee_id', intval($_POST['booking_employee_id']));
    }
}
add_action('save_post', 'captain_save_booking_rating');

// Update employee review score based on all ratings
function captain_update_employee_review_score($employee_id) {
    if (!$employee_id) return;

    // Query all bookings for this employee with ratings
    $bookings = get_posts(array(
        'post_type' => 'booking',
        'posts_per_page' => -1,
        'meta_query' => array(
            'relation' => 'AND',
            array(
                'key' => '_booking_employee_id',
                'value' => $employee_id
            ),
            array(
                'key' => '_booking_client_rating',
                'value' => '',
                'compare' => '!='
            )
        )
    ));

    if (empty($bookings)) return;

    // Calculate average rating
    $total_rating = 0;
    $rating_count = 0;

    foreach ($bookings as $booking) {
        $rating = get_post_meta($booking->ID, '_booking_client_rating', true);
        if (!empty($rating)) {
            $total_rating += intval($rating);
            $rating_count++;
        }
    }

    if ($rating_count > 0) {
        $average_rating = round($total_rating / $rating_count, 1);
        update_post_meta($employee_id, '_employee_review_score', $average_rating);
    }
}

// Add client rating form to the client booking details page
function captain_add_client_rating_form($content) {
    // Only add on single booking views
    if (!is_singular('booking')) {
        return $content;
    }

    global $post;
    $booking_id = $post->ID;

    // Check if booking is completed
    $status = get_post_meta($booking_id, '_booking_status', true);
    if ($status !== 'completed') {
        return $content;
    }

    // Check if user is allowed to rate
    $client_id = get_post_meta($booking_id, '_booking_client_id', true);
    $current_user = wp_get_current_user();

    // Get client email
    $client_email = get_post_meta($client_id, '_client_email', true);

    if (!is_user_logged_in() || ($current_user->user_email !== $client_email && !current_user_can('manage_options'))) {
        return $content;
    }

    // Check if already rated
    $rating = get_post_meta($booking_id, '_booking_client_rating', true);

    $rating_form = '';
    if (empty($rating)) {
        // Build rating form
        $rating_form .= '<div class="booking-rating-form">';
        $rating_form .= '<h3>Rate Your Experience</h3>';
        $rating_form .= '<p>Please rate your experience with our service:</p>';

        $rating_form .= '<form id="client-rating-form" method="post">';
        $rating_form .= '<div class="star-rating">';
        for ($i = 1; $i <= 5; $i++) {
            $rating_form .= '<label for="rating-' . $i . '">';
            $rating_form .= '<input type="radio" id="rating-' . $i . '" name="rating" value="' . $i . '">';
            $rating_form .= '<span class="star">☆</span>';
            $rating_form .= '</label>';
        }
        $rating_form .= '</div>';

        $rating_form .= '<div class="rating-comment">';
        $rating_form .= '<label for="rating-comment">Comments (optional):</label>';
        $rating_form .= '<textarea id="rating-comment" name="comment" rows="4"></textarea>';
        $rating_form .= '</div>';

        $rating_form .= '<input type="hidden" name="booking_id" value="' . esc_attr($booking_id) . '">';
        $rating_form .= wp_nonce_field('client_rating_nonce', 'rating_nonce', true, false);

        $rating_form .= '<button type="submit" class="submit-rating">Submit Rating</button>';
        $rating_form .= '</form>';

        $rating_form .= '<div id="rating-response"></div>';
        $rating_form .= '</div>';

        $rating_form .= '<script>
            jQuery(document).ready(function($) {
                // Star rating hover effect
                $(".star-rating label").hover(
                    function() {
                        $(this).prevAll("label").addBack().find("span").addClass("hover");
                    },
                    function() {
                        $(this).prevAll("label").addBack().find("span").removeClass("hover");
                    }
                );

                // Handle form submission
                $("#client-rating-form").on("submit", function(e) {
                    e.preventDefault();

                    var rating = $("input[name=\'rating\']:checked").val();
                    if (!rating) {
                        $("#rating-response").html("<p class=\'error\'>Please select a rating.</p>");
                        return;
                    }

                    var formData = $(this).serialize();

                    $.ajax({
                        url: captain_ajax.ajax_url,
                        type: "POST",
                        data: {
                            action: "captain_submit_client_rating",
                            formData: formData,
                            nonce: captain_ajax.nonce
                        },
                        success: function(response) {
                            if (response.success) {
                                $("#rating-response").html("<p class=\'success\'>" + response.data + "</p>");
                                $("#client-rating-form").hide();
                            } else {
                                $("#rating-response").html("<p class=\'error\'>" + response.data + "</p>");
                            }
                        },
                        error: function() {
                            $("#rating-response").html("<p class=\'error\'>An error occurred. Please try again.</p>");
                        }
                    });
                });
            });
        </script>';

        $rating_form .= '<style>
            .booking-rating-form {
                margin: 30px 0;
                padding: 20px;
                background: #f9f9ff;
                border-radius: 8px;
            }

            .star-rating {
                display: flex;
                margin-bottom: 15px;
            }

            .star-rating label {
                cursor: pointer;
                font-size: 30px;
                padding: 5px;
            }

            .star-rating input[type="radio"] {
                display: none;
            }

            .star-rating .star {
                color: #ddd;
                transition: color 0.3s;
            }

            .star-rating input[type="radio"]:checked ~ label .star,
            .star-rating label:hover ~ label .star,
            .star-rating label:hover .star,
            .star-rating .star.hover {
                color: #FFD700;
            }

            .rating-comment {
                margin-bottom: 15px;
            }

            .rating-comment label {
                display: block;
                margin-bottom: 5px;
            }

            .rating-comment textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }

            .submit-rating {
                background: #4299e1;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }

            .submit-rating:hover {
                background: #3182ce;
            }

            #rating-response .success {
                color: #38a169;
            }

            #rating-response .error {
                color: #e53e3e;
            }
        </style>';
    } else {
        // Show existing rating
        $rating_display = str_repeat('★', intval($rating)) . str_repeat('☆', 5 - intval($rating));
        $rating_comment = get_post_meta($booking_id, '_booking_client_rating_comment', true);

        $rating_form .= '<div class="booking-rating-display">';
        $rating_form .= '<h3>Your Rating</h3>';
        $rating_form .= '<div class="rating-stars">' . $rating_display . '</div>';

        if (!empty($rating_comment)) {
            $rating_form .= '<div class="rating-comment-display">';
            $rating_form .= '<h4>Your Comments:</h4>';
            $rating_form .= '<p>' . esc_html($rating_comment) . '</p>';
            $rating_form .= '</div>';
        }

        $rating_form .= '</div>';

        $rating_form .= '<style>
            .booking-rating-display {
                margin: 20px 0;
                padding: 15px;
                background: #f9f9ff;
                border-radius: 8px;
            }

            .rating-stars {
                font-size: 24px;
                color: #FFD700;
                margin-bottom: 10px;
            }

            .rating-comment-display {
                margin-top: 10px;
            }
        </style>';
    }

    return $content . $rating_form;
}
add_filter('the_content', 'captain_add_client_rating_form');

// AJAX handler for client rating submission
function captain_submit_client_rating() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }

    // Parse form data
    parse_str($_POST['formData'], $form_data);

    if (!isset($form_data['booking_id']) || !isset($form_data['rating']) || !wp_verify_nonce($form_data['rating_nonce'], 'client_rating_nonce')) {
        wp_send_json_error('Invalid form data');
        return;
    }

    $booking_id = intval($form_data['booking_id']);
    $rating = intval($form_data['rating']);
    $comment = isset($form_data['comment']) ? sanitize_textarea_field($form_data['comment']) : '';

    // Validate rating
    if ($rating < 1 || $rating > 5) {
        wp_send_json_error('Invalid rating value');
        return;
    }

    // Save rating data
    update_post_meta($booking_id, '_booking_client_rating', $rating);
    update_post_meta($booking_id, '_booking_client_rating_comment', $comment);

    // Update employee stats if assigned
    $employee_id = get_post_meta($booking_id, '_booking_employee_id', true);
    if ($employee_id) {
        captain_update_employee_review_score($employee_id);
    }

    wp_send_json_success('Thank you for your rating!');
}
add_action('wp_ajax_captain_submit_client_rating', 'captain_submit_client_rating');

// Display client rank on dashboard
function captain_display_client_rank($client_id) {
    $rating = get_post_meta($client_id, '_client_rating', true) ?: 5;
    $cancellations = get_post_meta($client_id, '_client_cancellations', true) ?: 0;
    $rank = captain_calculate_client_rank($rating, $cancellations);

    $output = '<div class="rank-display">';
    $output .= '<h4>Your Client Status</h4>';
    $output .= '<div class="rank-badge rank-' . strtolower($rank) . '">' . esc_html($rank) . '</div>';

    // Explain benefits
    $output .= '<div class="rank-benefits">';
    $output .= '<h5>Benefits of Your Status:</h5>';
    $output .= '<ul>';

    switch ($rank) {
        case 'Gold':
            $output .= '<li>Priority booking for high-demand dates</li>';
            $output .= '<li>10% discount on all services</li>';
            $output .= '<li>Access to exclusive yacht options</li>';
            $output .= '<li>Complimentary upgrades when available</li>';
            break;

        case 'Silver':
            $output .= '<li>5% discount on all services</li>';
            $output .= '<li>Early booking access (3 days before general availability)</li>';
            $output .= '<li>Preferred crew selection</li>';
            break;

        case 'Bronze':
            $output .= '<li>Early booking access (1 day before general availability)</li>';
            $output .= '<li>Free welcome package on board</li>';
            break;

        default:
            $output .= '<li>Regular booking privileges</li>';
            $output .= '<li>Standard service options</li>';
    }

    $output .= '</ul>';
    $output .= '</div>'; // .rank-benefits

    // Add info about how to improve rank
    if ($rank !== 'Gold') {
        $output .= '<div class="rank-improvement">';
        $output .= '<h5>How to Improve Your Status:</h5>';
        $output .= '<ul>';
        $output .= '<li>Complete bookings without cancellations</li>';
        $output .= '<li>Book more frequently</li>';
        $output .= '<li>Follow all charter rules and guidelines</li>';
        $output .= '</ul>';
        $output .= '</div>'; // .rank-improvement
    }

    $output .= '</div>'; // .rank-display

    return $output;
}

// Display employee rank on dashboard
function captain_display_employee_rank($employee_id) {
    $rating = get_post_meta($employee_id, '_employee_rating', true) ?: 5;
    $completed_jobs = get_post_meta($employee_id, '_employee_completed_jobs', true) ?: 0;
    $review_score = get_post_meta($employee_id, '_employee_review_score', true) ?: 0;
    $rank = captain_calculate_employee_rank($rating, $completed_jobs, $review_score);

    $output = '<div class="rank-display">';
    $output .= '<h4>Your Professional Rating</h4>';
    $output .= '<div class="rank-badge rank-' . strtolower($rank) . '">' . esc_html($rank) . '</div>';

    if ($review_score > 0) {
        $star_rating = str_repeat('★', round($review_score)) . str_repeat('☆', 5 - round($review_score));
        $output .= '<p><strong>Client Rating:</strong> ' . $star_rating . ' (' . number_format($review_score, 1) . ')</p>';
    }

    $output .= '<p><strong>Completed Jobs:</strong> ' . esc_html($completed_jobs) . '</p>';

    // Explain benefits
    $output .= '<div class="rank-benefits">';
    $output .= '<h5>Benefits of Your Rating:</h5>';
    $output .= '<ul>';

    switch ($rank) {
        case 'Gold':
            $output .= '<li>Priority assignment for high-value bookings</li>';
            $output .= '<li>10% higher commission rate</li>';
            $output .= '<li>Eligible for premium client assignments</li>';
            $output .= '<li>Featured crew member on the website</li>';
            break;

        case 'Silver':
            $output .= '<li>5% higher commission rate</li>';
            $output .= '<li>Priority over Bronze and Standard crew for assignments</li>';
            $output .= '<li>Regular performance bonuses</li>';
            break;

        case 'Bronze':
            $output .= '<li>Regular booking assignments</li>';
            $output .= '<li>Occasional performance bonuses</li>';
            break;

        default:
            $output .= '<li>Standard booking opportunities</li>';
            $output .= '<li>Standard commission rates</li>';
    }

    $output .= '</ul>';
    $output .= '</div>'; // .rank-benefits

    // Add info about how to improve rank
    if ($rank !== 'Gold') {
        $output .= '<div class="rank-improvement">';
        $output .= '<h5>How to Improve Your Rating:</h5>';
        $output .= '<ul>';
        $output .= '<li>Provide exceptional service to receive high client ratings</li>';
        $output .= '<li>Complete more assignments successfully</li>';
        $output .= '<li>Avoid cancellations or scheduling conflicts</li>';
        $output .= '<li>Take additional training and certification courses</li>';
        $output .= '</ul>';
        $output .= '</div>'; // .rank-improvement
    }

    $output .= '</div>'; // .rank-display

    return $output;
}