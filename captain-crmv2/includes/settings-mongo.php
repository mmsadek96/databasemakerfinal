<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Add MongoDB-specific settings to the settings page
function captain_mongodb_settings_init() {
    // Check if MongoDB integration is available
    if (!class_exists('Captain_MongoDB_Integration')) {
        return;
    }

    // Add MongoDB data management section to settings page
    add_settings_section(
        'captain_mongodb_data',
        'MongoDB Data Management',
        'captain_mongodb_data_section_callback',
        'captain-settings'
    );

    // Add data sync button
    add_settings_field(
        'captain_mongodb_sync',
        'Sync All Data',
        'captain_mongodb_sync_callback',
        'captain-settings',
        'captain_mongodb_data'
    );

    // Add performance metrics
    add_settings_field(
        'captain_mongodb_performance',
        'Performance Metrics',
        'captain_mongodb_performance_callback',
        'captain-settings',
        'captain_mongodb_data'
    );
}
add_action('admin_init', 'captain_mongodb_settings_init');

// MongoDB data section callback
function captain_mongodb_data_section_callback() {
    $mongodb = Captain_MongoDB_Integration::get_instance();
    if ($mongodb && $mongodb->is_enabled()) {
        echo '<p>Manage your MongoDB data synchronization and monitor performance.</p>';
    } else {
        echo '<p>MongoDB integration is not enabled. Enable it in the MongoDB Settings section above to use these features.</p>';
    }
}

// MongoDB sync callback
function captain_mongodb_sync_callback() {
    $mongodb = Captain_MongoDB_Integration::get_instance();
    if ($mongodb && $mongodb->is_enabled()) {
        echo '<a href="' . admin_url('admin.php?page=captain-settings&mongodb_sync=1') . '" class="button button-primary">Sync All Data to MongoDB</a>';
        echo '<p class="description">This will sync all clients and bookings to MongoDB. This may take a few minutes depending on the amount of data.</p>';
    } else {
        echo '<button class="button" disabled>Sync All Data to MongoDB</button>';
        echo '<p class="description">MongoDB integration must be enabled to sync data.</p>';
    }
}

// MongoDB performance metrics callback
function captain_mongodb_performance_callback() {
    $mongodb = Captain_MongoDB_Integration::get_instance();
    if ($mongodb && $mongodb->is_enabled()) {
        // Get MongoDB metrics
        $db = $mongodb->get_db();

        // Only continue if we have a valid DB connection
        if ($db) {
            try {
                // Get collection stats
                $booking_stats = $db->command(['collStats' => 'bookings'])->toArray()[0];
                $client_stats = $db->command(['collStats' => 'clients'])->toArray()[0];

                // Calculate storage metrics
                $booking_size = isset($booking_stats['size']) ? round($booking_stats['size'] / 1024, 2) : 0;
                $client_size = isset($client_stats['size']) ? round($client_stats['size'] / 1024, 2) : 0;
                $total_size = $booking_size + $client_size;

                // Get document counts
                $booking_count = isset($booking_stats['count']) ? $booking_stats['count'] : 0;
                $client_count = isset($client_stats['count']) ? $client_stats['count'] : 0;

                echo '<table class="widefat" style="width: auto;">';
                echo '<thead><tr><th>Collection</th><th>Documents</th><th>Size (KB)</th></tr></thead>';
                echo '<tbody>';
                echo '<tr><td>Bookings</td><td>' . $booking_count . '</td><td>' . $booking_size . '</td></tr>';
                echo '<tr><td>Clients</td><td>' . $client_count . '</td><td>' . $client_size . '</td></tr>';
                echo '<tr><td><strong>Total</strong></td><td>' . ($booking_count + $client_count) . '</td><td>' . $total_size . '</td></tr>';
                echo '</tbody></table>';

                // Show last sync time if available
                $last_sync_time = get_option('captain_mongodb_last_sync', 0);
                if ($last_sync_time > 0) {
                    echo '<p><strong>Last Full Sync:</strong> ' . date('F j, Y, g:i a', $last_sync_time) . '</p>';
                }
            } catch (Exception $e) {
                echo '<p class="description">Error fetching MongoDB metrics: ' . esc_html($e->getMessage()) . '</p>';
            }
        } else {
            echo '<p class="description">Could not connect to MongoDB database.</p>';
        }
    } else {
        echo '<p class="description">MongoDB integration must be enabled to view performance metrics.</p>';
    }
}

// Add a MongoDB tools page
function captain_add_mongodb_tools_page() {
    // Only add if MongoDB integration is enabled
    if (get_option('captain_mongodb_enabled', '0') !== '1') {
        return;
    }

    add_submenu_page(
        'edit.php?post_type=booking',
        'MongoDB Tools',
        'MongoDB Tools',
        'manage_options',
        'captain-mongodb-tools',
        'captain_mongodb_tools_page_callback'
    );
}
add_action('admin_menu', 'captain_add_mongodb_tools_page');

// MongoDB tools page callback
function captain_mongodb_tools_page_callback() {
    $mongodb = Captain_MongoDB_Integration::get_instance();
    if (!$mongodb || !$mongodb->is_enabled()) {
        echo '<div class="wrap"><h1>MongoDB Tools</h1><p>MongoDB integration is not enabled. Please enable it in the settings page.</p></div>';
        return;
    }

    // Handle index creation if requested
    if (isset($_POST['create_indexes']) && check_admin_referer('captain_mongodb_create_indexes')) {
        $result = $mongodb->create_indexes();
        if ($result) {
            echo '<div class="notice notice-success"><p>MongoDB indexes created successfully.</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>Failed to create MongoDB indexes. Check the error log for details.</p></div>';
        }
    }

    // Handle full sync if requested
    if (isset($_POST['full_sync']) && check_admin_referer('captain_mongodb_full_sync')) {
        $result = $mongodb->sync_all_data();
        if ($result) {
            update_option('captain_mongodb_last_sync', time());
            echo '<div class="notice notice-success"><p>All data synced to MongoDB successfully.</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>Failed to sync data to MongoDB. Check the error log for details.</p></div>';
        }
    }

    ?>
    <div class="wrap">
        <h1>MongoDB Tools</h1>

        <div class="card">
            <h2>Create Indexes</h2>
            <p>Create indexes in MongoDB to improve query performance. This should be done once after enabling MongoDB integration.</p>
            <form method="post">
                <?php wp_nonce_field('captain_mongodb_create_indexes'); ?>
                <input type="submit" name="create_indexes" class="button button-primary" value="Create Indexes">
            </form>
        </div>

        <div class="card" style="margin-top: 20px;">
            <h2>Full Data Sync</h2>
            <p>Sync all clients and bookings from WordPress to MongoDB. This may take a few minutes for large datasets.</p>
            <form method="post">
                <?php wp_nonce_field('captain_mongodb_full_sync'); ?>
                <input type="submit" name="full_sync" class="button button-primary" value="Perform Full Sync">
            </form>
        </div>

        <div class="card" style="margin-top: 20px;">
            <h2>MongoDB Health Check</h2>
            <?php
            try {
                $db = $mongodb->get_db();
                $status = $db->command(['ping' => 1])->toArray()[0];

                if (isset($status['ok']) && $status['ok'] == 1) {
                    echo '<div class="notice notice-success" style="margin-left: 0;"><p>MongoDB connection is healthy.</p></div>';

                    // Get server info
                    $server_status = $db->command(['serverStatus' => 1])->toArray()[0];
                    $server_version = isset($server_status['version']) ? $server_status['version'] : 'Unknown';
                    $server_uptime = isset($server_status['uptime']) ? floor($server_status['uptime'] / 86400) . ' days, ' .
                        gmdate('H:i:s', $server_status['uptime'] % 86400) : 'Unknown';

                    echo '<table class="widefat" style="margin-top: 10px;">';
                    echo '<tr><th>MongoDB Version</th><td>' . esc_html($server_version) . '</td></tr>';
                    echo '<tr><th>Server Uptime</th><td>' . esc_html($server_uptime) . '</td></tr>';
                    echo '<tr><th>Database Name</th><td>' . esc_html(get_option('captain_mongodb_name', 'captain_crm')) . '</td></tr>';
                    echo '</table>';
                } else {
                    echo '<div class="notice notice-error" style="margin-left: 0;"><p>MongoDB connection status check failed.</p></div>';
                }
            } catch (Exception $e) {
                echo '<div class="notice notice-error" style="margin-left: 0;"><p>MongoDB connection error: ' . esc_html($e->getMessage()) . '</p></div>';
            }
            ?>
        </div>
    </div>
    <?php
}

// Update last sync time when sync is performed
function captain_update_mongodb_sync_time() {
    if (isset($_GET['mongodb_sync']) && $_GET['mongodb_sync'] === '1' && current_user_can('manage_options')) {
        update_option('captain_mongodb_last_sync', time());
    }
}
add_action('admin_init', 'captain_update_mongodb_sync_time');