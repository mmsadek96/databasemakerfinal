<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Migration Tool for Captain CRM
 * Handles data migration from WordPress to MongoDB
 */
class Captain_Migration_Tool {
    /**
     * @var Captain_MongoDB_Integration MongoDB integration instance
     */
    private $mongodb;
    
    /**
     * Constructor
     */
    public function __construct() {
        // Only initialize if MongoDB is available
        if (class_exists('Captain_MongoDB_Integration')) {
            $this->mongodb = Captain_MongoDB_Integration::get_instance();
            
            // Register admin page
            add_action('admin_menu', array($this, 'add_migration_page'));
            
            // Register AJAX handlers for migration
            add_action('wp_ajax_captain_migrate_clients', array($this, 'ajax_migrate_clients'));
            add_action('wp_ajax_captain_migrate_bookings', array($this, 'ajax_migrate_bookings'));
            add_action('wp_ajax_captain_migration_progress', array($this, 'ajax_migration_progress'));
        }
    }
    
    /**
     * Add Migration Tool admin page
     */
    public function add_migration_page() {
        add_submenu_page(
            'edit.php?post_type=booking',
            'MongoDB Migration',
            'MongoDB Migration',
            'manage_options',
            'captain-mongodb-migration',
            array($this, 'render_migration_page')
        );
    }
    
    /**
     * Render Migration Tool admin page
     */
    public function render_migration_page() {
        // Check if MongoDB is enabled and working
        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            echo '<div class="wrap">';
            echo '<h1>MongoDB Migration Tool</h1>';
            echo '<div class="notice notice-error"><p>MongoDB integration is not enabled or not working. Please enable it in the settings page first.</p></div>';
            echo '</div>';
            return;
        }
        
        // Get counts
        $client_count = $this->get_client_count();
        $booking_count = $this->get_booking_count();
        
        // Get MongoDB counts
        $mongo_client_count = $this->get_mongo_client_count();
        $mongo_booking_count = $this->get_mongo_booking_count();
        
        ?>
        <div class="wrap">
            <h1>MongoDB Migration Tool</h1>
            
            <p>This tool helps you migrate your data from WordPress to MongoDB. Make sure you have a backup of your WordPress database before proceeding.</p>
            
            <div class="notice notice-warning">
                <p><strong>Warning:</strong> Running data migration on a live site may impact performance. It's recommended to run this during low-traffic periods.</p>
            </div>
            
            <h2>Current Data Status</h2>
            
            <table class="widefat" style="width: auto; margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th>Data Type</th>
                        <th>WordPress Count</th>
                        <th>MongoDB Count</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Clients</td>
                        <td id="wp-client-count"><?php echo $client_count; ?></td>
                        <td id="mongo-client-count"><?php echo $mongo_client_count; ?></td>
                        <td id="client-status">
                            <?php if ($client_count == $mongo_client_count && $client_count > 0): ?>
                                <span style="color: green;">Synced</span>
                            <?php elseif ($mongo_client_count > 0): ?>
                                <span style="color: orange;">Partially Synced</span>
                            <?php else: ?>
                                <span style="color: red;">Not Synced</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <td>Bookings</td>
                        <td id="wp-booking-count"><?php echo $booking_count; ?></td>
                        <td id="mongo-booking-count"><?php echo $mongo_booking_count; ?></td>
                        <td id="booking-status">
                            <?php if ($booking_count == $mongo_booking_count && $booking_count > 0): ?>
                                <span style="color: green;">Synced</span>
                            <?php elseif ($mongo_booking_count > 0): ?>
                                <span style="color: orange;">Partially Synced</span>
                            <?php else: ?>
                                <span style="color: red;">Not Synced</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <h2>Migration Options</h2>
            
            <div class="card" style="max-width: 800px;">
                <h3>Client Migration</h3>
                <p>Migrate all clients from WordPress to MongoDB.</p>
                <div class="migration-actions">
                    <button id="migrate-clients" class="button button-primary">Migrate Clients</button>
                    <span id="client-migration-status"></span>
                    <div id="client-progress-bar" style="display: none; margin-top: 10px;">
                        <div style="height: 20px; background-color: #f1f1f1; border-radius: 4px; overflow: hidden;">
                            <div id="client-progress" style="height: 100%; width: 0%; background-color: #4CAF50;"></div>
                        </div>
                        <p id="client-progress-text" style="margin-top: 5px;"></p>
                    </div>
                </div>
                
                <h3 style="margin-top: 20px;">Booking Migration</h3>
                <p>Migrate all bookings from WordPress to MongoDB.</p>
                <div class="migration-actions">
                    <button id="migrate-bookings" class="button button-primary">Migrate Bookings</button>
                    <span id="booking-migration-status"></span>
                    <div id="booking-progress-bar" style="display: none; margin-top: 10px;">
                        <div style="height: 20px; background-color: #f1f1f1; border-radius: 4px; overflow: hidden;">
                            <div id="booking-progress" style="height: 100%; width: 0%; background-color: #4CAF50;"></div>
                        </div>
                        <p id="booking-progress-text" style="margin-top: 5px;"></p>
                    </div>
                </div>
            </div>
            
            <div class="card" style="max-width: 800px; margin-top: 20px;">
                <h3>Verification Tools</h3>
                <p>These tools help you verify that data has been migrated correctly.</p>
                
                <div class="verification-actions">
                    <button id="verify-migration" class="button">Verify Migration</button>
                    <span id="verification-status"></span>
                </div>
                
                <div id="verification-results" style="margin-top: 15px; display: none;">
                    <h4>Verification Results</h4>
                    <pre id="verification-output" style="background: #f5f5f5; padding: 10px; max-height: 300px; overflow: auto;"></pre>
                </div>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            // Client migration
            $('#migrate-clients').on('click', function() {
                if (confirm('Are you sure you want to migrate all clients to MongoDB?')) {
                    var $button = $(this);
                    $button.prop('disabled', true);
                    $('#client-migration-status').text('Migration started...');
                    $('#client-progress-bar').show();
                    
                    // Start migration
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'captain_migrate_clients',
                            nonce: '<?php echo wp_create_nonce('captain_migration_nonce'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                // Start progress tracking
                                trackMigrationProgress('client');
                            } else {
                                $('#client-migration-status').html('<span style="color: red;">Error: ' + response.data + '</span>');
                                $button.prop('disabled', false);
                                $('#client-progress-bar').hide();
                            }
                        },
                        error: function() {
                            $('#client-migration-status').html('<span style="color: red;">Error: Migration failed to start</span>');
                            $button.prop('disabled', false);
                            $('#client-progress-bar').hide();
                        }
                    });
                }
            });
            
            // Booking migration
            $('#migrate-bookings').on('click', function() {
                if (confirm('Are you sure you want to migrate all bookings to MongoDB?')) {
                    var $button = $(this);
                    $button.prop('disabled', true);
                    $('#booking-migration-status').text('Migration started...');
                    $('#booking-progress-bar').show();
                    
                    // Start migration
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'captain_migrate_bookings',
                            nonce: '<?php echo wp_create_nonce('captain_migration_nonce'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                // Start progress tracking
                                trackMigrationProgress('booking');
                            } else {
                                $('#booking-migration-status').html('<span style="color: red;">Error: ' + response.data + '</span>');
                                $button.prop('disabled', false);
                                $('#booking-progress-bar').hide();
                            }
                        },
                        error: function() {
                            $('#booking-migration-status').html('<span style="color: red;">Error: Migration failed to start</span>');
                            $button.prop('disabled', false);
                            $('#booking-progress-bar').hide();
                        }
                    });
                }
            });
            
            // Verification
            $('#verify-migration').on('click', function() {
                var $button = $(this);
                $button.prop('disabled', true);
                $('#verification-status').text('Verifying...');
                $('#verification-results').show();
                $('#verification-output').text('Running verification...');
                
                // Perform verification checks
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'captain_verify_migration',
                        nonce: '<?php echo wp_create_nonce('captain_migration_nonce'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            $('#verification-status').html('<span style="color: green;">Verification complete</span>');
                            $('#verification-output').html(response.data);
                        } else {
                            $('#verification-status').html('<span style="color: red;">Verification failed</span>');
                            $('#verification-output').text('Error: ' + response.data);
                        }
                        $button.prop('disabled', false);
                    },
                    error: function() {
                        $('#verification-status').html('<span style="color: red;">Verification request failed</span>');
                        $('#verification-output').text('Error: Could not perform verification');
                        $button.prop('disabled', false);
                    }
                });
            });
            
            // Function to track migration progress
            function trackMigrationProgress(type) {
                var progressCheck = setInterval(function() {
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'captain_migration_progress',
                            migration_type: type,
                            nonce: '<?php echo wp_create_nonce('captain_migration_nonce'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                var data = response.data;
                                var progress = Math.round((data.processed / data.total) * 100);
                                
                                $('#' + type + '-progress').css('width', progress + '%');
                                $('#' + type + '-progress-text').text('Processed ' + data.processed + ' of ' + data.total + ' (' + progress + '%)');
                                
                                if (data.completed) {
                                    clearInterval(progressCheck);
                                    $('#' + type + '-migration-status').html('<span style="color: green;">Migration completed!</span>');
                                    $('#migrate-' + type + 's').prop('disabled', false);
                                    
                                    // Update counts
                                    $('#mongo-' + type + '-count').text(data.total);
                                    $('#' + type + '-status').html('<span style="color: green;">Synced</span>');
                                    
                                    // Hide progress bar after a delay
                                    setTimeout(function() {
                                        $('#' + type + '-progress-bar').fadeOut();
                                    }, 3000);
                                }
                            } else {
                                $('#' + type + '-migration-status').html('<span style="color: red;">Error checking progress: ' + response.data + '</span>');
                            }
                        },
                        error: function() {
                            $('#' + type + '-migration-status').html('<span style="color: red;">Error checking progress</span>');
                        }
                    });
                }, 1000); // Check every second
            }
        });
        </script>
        <?php
    }
    
    /**
     * Get count of clients in WordPress
     * 
     * @return int
     */
    private function get_client_count() {
        $count_posts = wp_count_posts('client');
        return $count_posts->publish;
    }
    
    /**
     * Get count of bookings in WordPress
     * 
     * @return int
     */
    private function get_booking_count() {
        $count_posts = wp_count_posts('booking');
        return $count_posts->publish;
    }
    
    /**
     * Get count of clients in MongoDB
     * 
     * @return int
     */
    private function get_mongo_client_count() {
        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            return 0;
        }
        
        try {
            $db = $this->mongodb->get_db();
            return $db->clients->countDocuments();
        } catch (Exception $e) {
            error_log('MongoDB Client Count Error: ' . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Get count of bookings in MongoDB
     * 
     * @return int
     */
    private function get_mongo_booking_count() {
        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            return 0;
        }
        
        try {
            $db = $this->mongodb->get_db();
            return $db->bookings->countDocuments();
        } catch (Exception $e) {
            error_log('MongoDB Booking Count Error: ' . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * AJAX handler for migrating clients
     */
    public function ajax_migrate_clients() {
        check_ajax_referer('captain_migration_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
            return;
        }
        
        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            wp_send_json_error('MongoDB integration is not enabled');
            return;
        }
        
        // Start the migration process in the background
        wp_schedule_single_event(time(), 'captain_migrate_clients_event');
        
        // Store initial migration state
        $migration_data = array(
            'total' => $this->get_client_count(),
            'processed' => 0,
            'completed' => false,
            'errors' => array(),
            'start_time' => time()
        );
        
        update_option('captain_migration_client_progress', $migration_data);
        
        wp_send_json_success('Migration started');
    }
    
    /**
     * AJAX handler for migrating bookings
     */
    public function ajax_migrate_bookings() {
        check_ajax_referer('captain_migration_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
            return;
        }
        
        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            wp_send_json_error('MongoDB integration is not enabled');
            return;
        }
        
        // Start the migration process in the background
        wp_schedule_single_event(time(), 'captain_migrate_bookings_event');
        
        // Store initial migration state
        $migration_data = array(
            'total' => $this->get_booking_count(),
            'processed' => 0,
            'completed' => false,
            'errors' => array(),
            'start_time' => time()
        );
        
        update_option('captain_migration_booking_progress', $migration_data);
        
        wp_send_json_success('Migration started');
    }
    
    /**
     * AJAX handler for checking migration progress
     */
    public function ajax_migration_progress() {
        check_ajax_referer('captain_migration_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
            return;
        }
        
        $type = sanitize_text_field($_POST['migration_type']);
        
        if (!in_array($type, array('client', 'booking'))) {
            wp_send_json_error('Invalid migration type');
            return;
        }
        
        $progress = get_option('captain_migration_' . $type . '_progress', array());
        
        if (empty($progress)) {
            wp_send_json_error('No migration in progress');
            return;
        }
        
        wp_send_json_success($progress);
    }
    
    /**
     * Background process for client migration
     */
    public function migrate_clients_process() {
        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            return;
        }
        
        // Get all clients
        $clients = get_posts(array(
            'post_type' => 'client',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        ));
        
        $total = count($clients);
        $processed = 0;
        $errors = array();
        
        foreach ($clients as $client) {
            try {
                $this->mongodb->sync_client_to_mongodb($client->ID, $client, true);
                $processed++;
                
                // Update progress every 10 clients
                if ($processed % 10 === 0) {
                    update_option('captain_migration_client_progress', array(
                        'total' => $total,
                        'processed' => $processed,
                        'completed' => false,
                        'errors' => $errors,
                        'start_time' => get_option('captain_migration_client_progress')['start_time']
                    ));
                }
            } catch (Exception $e) {
                $errors[] = 'Error migrating client #' . $client->ID . ': ' . $e->getMessage();
                error_log('Client Migration Error: ' . $e->getMessage());
            }
        }
        
        // Mark migration as completed
        update_option('captain_migration_client_progress', array(
            'total' => $total,
            'processed' => $processed,
            'completed' => true,
            'errors' => $errors,
            'start_time' => get_option('captain_migration_client_progress')['start_time'],
            'end_time' => time()
        ));
    }
    
    /**
     * Background process for booking migration
     */
    public function migrate_bookings_process() {
        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            return;
        }
        
        // Get all bookings
        $bookings = get_posts(array(
            'post_type' => 'booking',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        ));
        
        $total = count($bookings);
        $processed = 0;
        $errors = array();
        
        foreach ($bookings as $booking) {
            try {
                $this->mongodb->sync_booking_to_mongodb($booking->ID, $booking, true);
                $processed++;
                
                // Update progress every 10 bookings
                if ($processed % 10 === 0) {
                    update_option('captain_migration_booking_progress', array(
                        'total' => $total,
                        'processed' => $processed,
                        'completed' => false,
                        'errors' => $errors,
                        'start_time' => get_option('captain_migration_booking_progress')['start_time']
                    ));
                }
            } catch (Exception $e) {
                $errors[] = 'Error migrating booking #' . $booking->ID . ': ' . $e->getMessage();
                error_log('Booking Migration Error: ' . $e->getMessage());
            }
        }
        
        // Mark migration as completed
        update_option('captain_migration_booking_progress', array(
            'total' => $total,
            'processed' => $processed,
            'completed' => true,
            'errors' => $errors,
            'start_time' => get_option('captain_migration_booking_progress')['start_time'],
            'end_time' => time()
        ));
    }
    
    /**
     * AJAX handler for verifying migration
     */
    public function ajax_verify_migration() {
        check_ajax_referer('captain_migration_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
            return;
        }
        
        if (!$this->mongodb || !$this->mongodb->is_enabled()) {
            wp_send_json_error('MongoDB integration is not enabled');
            return;
        }
        
        try {
            $db = $this->mongodb->get_db();
            
            // Client verification
            $wp_client_count = $this->get_client_count();
            $mongo_client_count = $this->get_mongo_client_count();
            
            // Booking verification
            $wp_booking_count = $this->get_booking_count();
            $mongo_booking_count = $this->get_mongo_booking_count();
            
            // Sample check of 5 random clients
            $sample_clients = get_posts(array(
                'post_type' => 'client',
                'posts_per_page' => 5,
                'orderby' => 'rand',
                'post_status' => 'publish'
            ));
            
            $client_samples = array();
            foreach ($sample_clients as $client) {
                $client_id = $client->ID;
                $mongo_client = $db->clients->findOne(['wordpress_id' => $client_id]);
                
                $client_samples[] = array(
                    'wp_id' => $client_id,
                    'wp_name' => $client->post_title,
                    'mongo_exists' => $mongo_client ? 'Yes' : 'No',
                    'mongo_name' => $mongo_client ? $mongo_client['name'] : 'N/A'
                );
            }
            
            // Sample check of 5 random bookings
            $sample_bookings = get_posts(array(
                'post_type' => 'booking',
                'posts_per_page' => 5,
                'orderby' => 'rand',
                'post_status' => 'publish'
            ));
            
            $booking_samples = array();
            foreach ($sample_bookings as $booking) {
                $booking_id = $booking->ID;
                $mongo_booking = $db->bookings->findOne(['wordpress_id' => $booking_id]);
                
                $booking_samples[] = array(
                    'wp_id' => $booking_id,
                    'wp_title' => $booking->post_title,
                    'mongo_exists' => $mongo_booking ? 'Yes' : 'No',
                    'mongo_title' => $mongo_booking ? $mongo_booking['title'] : 'N/A'
                );
            }
            
            // Format verification output
            $output = "=== Migration Verification ===\n\n";
            $output .= "Clients:\n";
            $output .= "  WordPress Count: {$wp_client_count}\n";
            $output .= "  MongoDB Count: {$mongo_client_count}\n";
            $output .= "  Match: " . ($wp_client_count === $mongo_client_count ? "Yes" : "No") . "\n\n";
            
            $output .= "Bookings:\n";
            $output .= "  WordPress Count: {$wp_booking_count}\n";
            $output .= "  MongoDB Count: {$mongo_booking_count}\n";
            $output .= "  Match: " . ($wp_booking_count === $mongo_booking_count ? "Yes" : "No") . "\n\n";
            
            $output .= "Sample Client Verification:\n";
            foreach ($client_samples as $sample) {
                $output .= "  ID: {$sample['wp_id']} | WP Name: {$sample['wp_name']} | In MongoDB: {$sample['mongo_exists']} | MongoDB Name: {$sample['mongo_name']}\n";
            }
            $output .= "\n";
            
            $output .= "Sample Booking Verification:\n";
            foreach ($booking_samples as $sample) {
                $output .= "  ID: {$sample['wp_id']} | WP Title: {$sample['wp_title']} | In MongoDB: {$sample['mongo_exists']} | MongoDB Title: {$sample['mongo_title']}\n";
            }
            $output .= "\n";

            $output .= "Verification completed at: " . date('Y-m-d H:i:s') . "\n";

            wp_send_json_success($output);
        } catch (Exception $e) {
            wp_send_json_error('Verification failed: ' . $e->getMessage());
        }
    }
}

// Initialize the Migration Tool
function captain_migration_tool_init() {
    // Only initialize if MongoDB is enabled
    if (get_option('captain_mongodb_enabled', '0') === '1') {
        new Captain_Migration_Tool();
    }
}
add_action('plugins_loaded', 'captain_migration_tool_init');

// Register background processing hooks
add_action('captain_migrate_clients_event', array('Captain_Migration_Tool', 'migrate_clients_process'));
add_action('captain_migrate_bookings_event', array('Captain_Migration_Tool', 'migrate_bookings_process'));

// Add AJAX handler for verification
add_action('wp_ajax_captain_verify_migration', array('Captain_Migration_Tool', 'ajax_verify_migration'));