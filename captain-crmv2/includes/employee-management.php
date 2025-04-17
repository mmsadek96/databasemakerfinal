<?php
// Add this to includes/employee-management.php

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Captain_Employee_Management {

    public function __construct() {
        // Actions for employee creation and management
        add_action('wp_ajax_captain_add_employee', array($this, 'process_add_employee'));
        add_action('admin_post_captain_add_employee', array($this, 'process_add_employee_form'));

        // Add employee management page to employer dashboard
        add_action('init', array($this, 'register_employee_management_shortcode'));
    }

    /**
     * Register shortcode for employee management page
     */
    public function register_employee_management_shortcode() {
        add_shortcode('captain_employee_management', array($this, 'employee_management_shortcode'));
    }

    /**
     * Process AJAX employee creation
     */
    public function process_add_employee() {
        // Verify nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_employee_nonce')) {
            wp_send_json_error('Security check failed');
            return;
        }

        // Verify permissions - user must be employer or admin
        if (!$this->user_can_add_employees()) {
            wp_send_json_error('You do not have permission to add employees');
            return;
        }

        $employee_data = $this->validate_employee_data($_POST);
        if (is_wp_error($employee_data)) {
            wp_send_json_error($employee_data->get_error_message());
            return;
        }

        $employee_id = $this->create_employee($employee_data);
        if (is_wp_error($employee_id)) {
            wp_send_json_error($employee_id->get_error_message());
            return;
        }

        wp_send_json_success(array(
            'message' => 'Employee added successfully',
            'employee_id' => $employee_id
        ));
    }

    /**
     * Process form submission for employee creation
     */
    public function process_add_employee_form() {
        // Verify nonce
        if (!isset($_POST['captain_employee_nonce']) || !wp_verify_nonce($_POST['captain_employee_nonce'], 'captain_employee_form')) {
            wp_die('Security check failed');
            return;
        }

        // Verify permissions
        if (!$this->user_can_add_employees()) {
            wp_die('You do not have permission to add employees');
            return;
        }

        $employee_data = $this->validate_employee_data($_POST);
        if (is_wp_error($employee_data)) {
            wp_die($employee_data->get_error_message());
            return;
        }

        $employee_id = $this->create_employee($employee_data);
        if (is_wp_error($employee_id)) {
            wp_die($employee_id->get_error_message());
            return;
        }

        // Redirect back to employee management page
        $redirect_url = add_query_arg('message', 'employee_added', $_POST['_wp_http_referer']);
        wp_safe_redirect($redirect_url);
        exit;
    }

    /**
     * Validate employee data from form submission
     */
    private function validate_employee_data($data) {
        $employee_data = array();

        // Required fields
        $required_fields = array('employee_name', 'employee_email', 'employee_phone', 'employee_position');
        foreach ($required_fields as $field) {
            if (empty($data[$field])) {
                return new WP_Error('missing_field', 'Please fill out all required fields.');
            }
            $employee_data[$field] = sanitize_text_field($data[$field]);
        }

        // Validate email
        if (!is_email($employee_data['employee_email'])) {
            return new WP_Error('invalid_email', 'Please enter a valid email address.');
        }

        // Check if email already exists
        $existing = get_posts(array(
            'post_type' => 'employee',
            'meta_key' => '_employee_email',
            'meta_value' => $employee_data['employee_email'],
            'posts_per_page' => 1
        ));

        if (!empty($existing)) {
            return new WP_Error('email_exists', 'An employee with this email already exists.');
        }

        // Optional fields
        $optional_fields = array('employee_qualifications', 'employee_notes');
        foreach ($optional_fields as $field) {
            if (isset($data[$field])) {
                $employee_data[$field] = sanitize_textarea_field($data[$field]);
            } else {
                $employee_data[$field] = '';
            }
        }

        // Add current user as employer
        $employee_data['employer_id'] = get_current_user_id();

        return $employee_data;
    }

    /**
     * Create employee post and metadata
     */
    private function create_employee($employee_data) {
        // Create employee post
        $employee_id = wp_insert_post(array(
            'post_title' => $employee_data['employee_name'],
            'post_status' => 'publish',
            'post_type' => 'employee',
        ));

        if (is_wp_error($employee_id)) {
            return $employee_id;
        }

        // Add employee meta data
        update_post_meta($employee_id, '_employee_email', $employee_data['employee_email']);
        update_post_meta($employee_id, '_employee_phone', $employee_data['employee_phone']);
        update_post_meta($employee_id, '_employee_position', $employee_data['employee_position']);
        update_post_meta($employee_id, '_employee_qualifications', $employee_data['employee_qualifications']);
        update_post_meta($employee_id, '_employee_notes', $employee_data['employee_notes']);
        update_post_meta($employee_id, '_employee_employer_id', $employee_data['employer_id']);

        // Set initial rating/rank values
        update_post_meta($employee_id, '_employee_rating', 5);
        update_post_meta($employee_id, '_employee_completed_jobs', 0);
        update_post_meta($employee_id, '_employee_review_score', 0);

        // Optional: Create WP user for employee
        if (isset($employee_data['create_user']) && $employee_data['create_user']) {
            $this->create_employee_user($employee_id, $employee_data);
        }

        return $employee_id;
    }

    /**
     * Check if current user can add employees
     */
    private function user_can_add_employees() {
        // Admin can always add employees
        if (current_user_can('manage_options')) {
            return true;
        }

        // Check if user has employer role or meta flag
        $user_id = get_current_user_id();
        if (!$user_id) {
            return false;
        }

        // Check for employer role
        if (in_array('employer', (array) wp_get_current_user()->roles)) {
            return true;
        }

        // Check for employer meta flag
        $is_employer = get_user_meta($user_id, '_captain_is_employer', true);
        if ($is_employer) {
            return true;
        }

        return false;
    }

    /**
     * Employee management shortcode callback
     */
    public function employee_management_shortcode($atts) {
        if (!is_user_logged_in()) {
            return '<p>Please <a href="' . wp_login_url(get_permalink()) . '">log in</a> to manage employees.</p>';
        }

        if (!$this->user_can_add_employees()) {
            return '<p>You do not have permission to manage employees.</p>';
        }

        ob_start();
        include CAPTAIN_CRM_PLUGIN_DIR . 'templates/employee-management.php';
        return ob_get_clean();
    }
}

// Initialize the class
new Captain_Employee_Management();