<?php
// Create a new file: includes/document-manager.php

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Captain_Document_Manager {

    private $allowed_file_types;
    private $max_file_size;

    public function __construct() {
        // Set allowed file types and max size
        $this->allowed_file_types = array(
            'pdf'  => 'application/pdf',
            'doc'  => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png'
        );
        // 10MB max size (in bytes)
        $this->max_file_size = 10 * 1024 * 1024;

        // Register hooks
        add_action('wp_ajax_captain_upload_document', array($this, 'handle_document_upload'));
        add_action('wp_ajax_captain_delete_document', array($this, 'handle_document_delete'));
        add_action('init', array($this, 'register_document_shortcode'));
    }

    /**
     * Register documents shortcode
     */
    public function register_document_shortcode() {
        add_shortcode('captain_crew_documents', array($this, 'crew_documents_shortcode'));
    }

    /**
     * Handle document upload via AJAX
     */
    public function handle_document_upload() {
        // Check nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_document_nonce')) {
            wp_send_json_error('Security check failed');
            return;
        }

        // Check if user is logged in
        if (!is_user_logged_in()) {
            wp_send_json_error('You must be logged in to upload documents');
            return;
        }

        // Check if file was uploaded
        if (empty($_FILES['document_file']) || !isset($_FILES['document_file']['tmp_name']) || empty($_FILES['document_file']['tmp_name'])) {
            wp_send_json_error('No file was uploaded');
            return;
        }

        // Get employee ID
        $employee_id = isset($_POST['employee_id']) ? intval($_POST['employee_id']) : 0;

        // If no employee ID was provided, try to get by current user email
        if (!$employee_id) {
            $current_user = wp_get_current_user();
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

        if (!$employee_id) {
            wp_send_json_error('Employee profile not found');
            return;
        }

        // Check file type
        $file = $_FILES['document_file'];
        $file_type = wp_check_filetype($file['name'], $this->allowed_file_types);

        if (!$file_type['type']) {
            wp_send_json_error('Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG');
            return;
        }

        // Check file size
        if ($file['size'] > $this->max_file_size) {
            wp_send_json_error('File is too large. Maximum size: 10MB');
            return;
        }

        // Validate document type
        $document_type = isset($_POST['document_type']) ? sanitize_text_field($_POST['document_type']) : '';
        if (empty($document_type)) {
            wp_send_json_error('Please select a document type');
            return;
        }

        // Get document expiration date if provided
        $expiry_date = isset($_POST['expiry_date']) ? sanitize_text_field($_POST['expiry_date']) : '';

        // Create upload directory if it doesn't exist
        $upload_dir = wp_upload_dir();
        $document_dir = $upload_dir['basedir'] . '/captain-crm/employee-' . $employee_id;

        if (!file_exists($document_dir)) {
            wp_mkdir_p($document_dir);

            // Create .htaccess file to protect uploads
            $htaccess_content = "# Deny direct access to files\n";
            $htaccess_content .= "<Files \"*\">\n";
            $htaccess_content .= "Require all denied\n";
            $htaccess_content .= "</Files>";

            file_put_contents($document_dir . '/.htaccess', $htaccess_content);
        }

        // Generate unique filename
        $filename = sanitize_file_name($document_type . '-' . time() . '.' . $file_type['ext']);
        $file_path = $document_dir . '/' . $filename;

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $file_path)) {
            wp_send_json_error('Failed to upload file');
            return;
        }

        // Get existing documents
        $documents = get_post_meta($employee_id, '_employee_documents', true);
        if (!is_array($documents)) {
            $documents = array();
        }

        // Add new document
        $documents[] = array(
            'type' => $document_type,
            'filename' => $filename,
            'original_name' => $file['name'],
            'date_uploaded' => current_time('mysql'),
            'expiry_date' => $expiry_date,
            'file_type' => $file_type['type'],
            'file_size' => $file['size']
        );

        // Update employee meta
        update_post_meta($employee_id, '_employee_documents', $documents);

        // Return success
        wp_send_json_success(array(
            'message' => 'Document uploaded successfully',
            'document_type' => $document_type,
            'expiry_date' => $expiry_date ? date('F j, Y', strtotime($expiry_date)) : 'N/A'
        ));
    }

    /**
     * Handle document deletion via AJAX
     */
    public function handle_document_delete() {
        // Check nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'captain_document_nonce')) {
            wp_send_json_error('Security check failed');
            return;
        }

        // Check if user is logged in
        if (!is_user_logged_in()) {
            wp_send_json_error('You must be logged in to delete documents');
            return;
        }

        // Get employee ID
        $employee_id = isset($_POST['employee_id']) ? intval($_POST['employee_id']) : 0;

        // If no employee ID was provided, try to get by current user email
        if (!$employee_id) {
            $current_user = wp_get_current_user();
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

        if (!$employee_id) {
            wp_send_json_error('Employee profile not found');
            return;
        }

        // Verify user has permission to delete this document
        $current_user = wp_get_current_user();
        $employee_email = get_post_meta($employee_id, '_employee_email', true);
        $employer_id = get_post_meta($employee_id, '_employee_employer_id', true);

        // Check if user is the employee, employer, or admin
        if (!current_user_can('manage_options') &&
            $current_user->user_email != $employee_email &&
            $current_user->ID != $employer_id) {
            wp_send_json_error('You do not have permission to delete this document');
            return;
        }

        // Get document index
        $document_index = isset($_POST['document_index']) ? intval($_POST['document_index']) : -1;
        if ($document_index < 0) {
            wp_send_json_error('Invalid document');
            return;
        }

        // Get documents
        $documents = get_post_meta($employee_id, '_employee_documents', true);
        if (!is_array($documents) || !isset($documents[$document_index])) {
            wp_send_json_error('Document not found');
            return;
        }

        // Get document info
        $document = $documents[$document_index];

        // Delete file
        $upload_dir = wp_upload_dir();
        $file_path = $upload_dir['basedir'] . '/captain-crm/employee-' . $employee_id . '/' . $document['filename'];

        if (file_exists($file_path)) {
            unlink($file_path);
        }

        // Remove document from array
        array_splice($documents, $document_index, 1);

        // Update employee meta
        update_post_meta($employee_id, '_employee_documents', $documents);

        // Return success
        wp_send_json_success(array(
            'message' => 'Document deleted successfully'
        ));
    }

    /**
     * Generate secure download URL for a document
     */
    public function get_document_download_url($employee_id, $document_index) {
        $nonce = wp_create_nonce('download_document_' . $employee_id . '_' . $document_index);
        return add_query_arg(array(
            'action' => 'captain_download_document',
            'employee' => $employee_id,
            'document' => $document_index,
            'nonce' => $nonce
        ), admin_url('admin-ajax.php'));
    }

    /**
     * Document management shortcode
     */
    public function crew_documents_shortcode($atts) {
        if (!is_user_logged_in()) {
            return '<p>Please <a href="' . wp_login_url(get_permalink()) . '">log in</a> to manage your documents.</p>';
        }

        // Get employee ID for current user
        $current_user = wp_get_current_user();
        $employees = get_posts(array(
            'post_type' => 'employee',
            'posts_per_page' => 1,
            'meta_key' => '_employee_email',
            'meta_value' => $current_user->user_email,
            'meta_compare' => '='
        ));

        if (empty($employees)) {
            return '<p>No employee profile found for your account. Please contact your employer.</p>';
        }

        $employee_id = $employees[0]->ID;

        // Get documents
        $documents = get_post_meta($employee_id, '_employee_documents', true);
        if (!is_array($documents)) {
            $documents = array();
        }

        ob_start();
        include CAPTAIN_CRM_PLUGIN_DIR . 'templates/crew-documents.php';
        return ob_get_clean();
    }
}

// Initialize the class
new Captain_Document_Manager();