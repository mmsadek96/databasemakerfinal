<?php
// Create this as templates/employee-management.php

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Display success message if employee was added
if (isset($_GET['message']) && $_GET['message'] === 'employee_added') {
    echo '<div class="captain-notice success"><p>Employee added successfully!</p></div>';
}

// Get current user's employees
$current_user_id = get_current_user_id();
$employees = get_posts(array(
    'post_type' => 'employee',
    'posts_per_page' => -1,
    'meta_key' => '_employee_employer_id',
    'meta_value' => $current_user_id
));
?>

<div class="captain-employee-management">
    <div class="employee-tabs">
        <button class="employee-tab-btn active" data-tab="employee-list">My Employees</button>
        <button class="employee-tab-btn" data-tab="add-employee">Add New Employee</button>
    </div>

    <div id="employee-list" class="employee-tab-content active">
        <h3>My Employees</h3>

        <?php if (empty($employees)): ?>
            <p>You haven't added any employees yet.</p>
        <?php else: ?>
            <div class="employee-list">
                <?php foreach ($employees as $employee):
                    $email = get_post_meta($employee->ID, '_employee_email', true);
                    $phone = get_post_meta($employee->ID, '_employee_phone', true);
                    $position = get_post_meta($employee->ID, '_employee_position', true);
                    $rating = get_post_meta($employee->ID, '_employee_rating', true) ?: 5;
                    $review_score = get_post_meta($employee->ID, '_employee_review_score', true) ?: 0;
                ?>
                <div class="employee-card">
                    <h4><?php echo esc_html($employee->post_title); ?></h4>
                    <div class="employee-details">
                        <p><strong>Position:</strong> <?php echo esc_html($position); ?></p>
                        <p><strong>Email:</strong> <?php echo esc_html($email); ?></p>
                        <p><strong>Phone:</strong> <?php echo esc_html($phone); ?></p>
                        <?php if ($review_score > 0): ?>
                            <p><strong>Client Rating:</strong>
                                <?php echo str_repeat('★', round($review_score)) . str_repeat('☆', 5 - round($review_score)); ?>
                                (<?php echo number_format($review_score, 1); ?>)
                            </p>
                        <?php endif; ?>
                    </div>
                    <div class="employee-actions">
                        <a href="?action=edit-employee&id=<?php echo $employee->ID; ?>" class="button edit-employee">Edit</a>
                        <button class="button view-assignments" data-employee="<?php echo $employee->ID; ?>">View Assignments</button>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

    <div id="add-employee" class="employee-tab-content">
        <h3>Add New Employee</h3>

        <form id="employee-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="captain_add_employee">
            <?php wp_nonce_field('captain_employee_form', 'captain_employee_nonce'); ?>

            <div class="form-row">
                <div class="form-group">
                    <label for="employee_name" class="required-field">Full Name</label>
                    <input type="text" id="employee_name" name="employee_name" required>
                </div>

                <div class="form-group">
                    <label for="employee_email" class="required-field">Email Address</label>
                    <input type="email" id="employee_email" name="employee_email" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="employee_phone" class="required-field">Phone Number</label>
                    <input type="tel" id="employee_phone" name="employee_phone" required>
                </div>

                <div class="form-group">
                    <label for="employee_position" class="required-field">Position</label>
                    <select id="employee_position" name="employee_position" required>
                        <option value="">Select Position</option>
                        <option value="captain">Captain</option>
                        <option value="chef">Chef</option>
                        <option value="steward">Steward/Stewardess</option>
                        <option value="deckhand">Deckhand</option>
                        <option value="engineer">Engineer</option>
                        <option value="instructor">Sailing Instructor</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="employee_qualifications">Qualifications</label>
                <textarea id="employee_qualifications" name="employee_qualifications" rows="3"></textarea>
            </div>

            <div class="form-group">
                <label for="employee_notes">Additional Notes</label>
                <textarea id="employee_notes" name="employee_notes" rows="3"></textarea>
            </div>

            <div class="form-group">
                <label>
                    <input type="checkbox" name="create_user" value="1">
                    Create user account for this employee
                </label>
            </div>

            <div class="form-submit">
                <button type="submit" class="submit-button">Add Employee</button>
            </div>
        </form>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    // Tab switching
    $('.employee-tab-btn').on('click', function() {
        var tab = $(this).data('tab');

        // Update active tab
        $('.employee-tab-btn').removeClass('active');
        $(this).addClass('active');

        // Show corresponding content
        $('.employee-tab-content').removeClass('active');
        $('#' + tab).addClass('active');
    });

    // AJAX form submission
    $('#employee-form').on('submit', function(e) {
        // If you want to handle the form submission via AJAX instead of page reload
        // Uncomment this section
        /*
        e.preventDefault();

        var formData = $(this).serialize();
        formData += '&action=captain_add_employee&nonce=' + captain_ajax.nonce;

        $.ajax({
            url: captain_ajax.ajax_url,
            type: 'POST',
            data: formData,
            success: function(response) {
                if (response.success) {
                    alert('Employee added successfully!');
                    window.location.reload();
                } else {
                    alert('Error: ' + response.data);
                }
            },
            error: function() {
                alert('An error occurred. Please try again.');
            }
        });
        */
    });
});
</script>

<style>
.captain-employee-management {
    max-width: 900px;
    margin: 20px auto;
}

.employee-tabs {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 1px solid #ddd;
}

.employee-tab-btn {
    padding: 10px 20px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-weight: 500;
}

.employee-tab-btn.active {
    border-bottom-color: #2b6cb0;
    color: #2b6cb0;
}

.employee-tab-content {
    display: none;
}

.employee-tab-content.active {
    display: block;
}

.employee-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.employee-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
}

.employee-card h4 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #2d3748;
}

.employee-details {
    margin-bottom: 15px;
}

.employee-details p {
    margin: 5px 0;
}

.employee-actions {
    display: flex;
    gap: 10px;
}

.captain-notice {
    padding: 10px 15px;
    border-radius: 5px;
    margin-bottom: 20px;
}

.captain-notice.success {
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
}

.required-field:after {
    content: "*";
    color: #e53e3e;
    margin-left: 4px;
}
</style>