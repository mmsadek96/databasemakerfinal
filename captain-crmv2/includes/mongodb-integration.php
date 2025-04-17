<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * MongoDB Integration for Captain CRM
 *
 * Handles connection to MongoDB and provides methods to interact with the database
 */
class Captain_MongoDB_Integration {
    /**
     * @var MongoDB\Database|null MongoDB database instance
     */
    private $db = null;

    /**
     * @var bool Whether MongoDB integration is enabled and functioning
     */
    private $enabled = false;

    /**
     * @var Captain_MongoDB_Integration Single instance of this class
     */
    private static $instance = null;

    /**
     * Get singleton instance
     *
     * @return Captain_MongoDB_Integration
     */
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        // Check if MongoDB extension is available
        if (!class_exists('MongoDB\Client')) {
            add_action('admin_notices', array($this, 'missing_driver_notice'));
            return;
        }

        // Connect to MongoDB
        $this->connect();

        if ($this->enabled) {
            $this->init_hooks();
        }
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Data synchronization hooks
        add_action('save_post_booking', array($this, 'sync_booking_to_mongodb'), 10, 3);
        add_action('save_post_client', array($this, 'sync_client_to_mongodb'), 10, 3);
        add_action('delete_post', array($this, 'delete_document_from_mongodb'));

        // Add settings field
        add_action('admin_init', array($this, 'register_settings'));
    }

    /**
     * Connect to MongoDB
     *
     * @return bool True if connection successful, false otherwise
     */
    public function connect() {
        try {
            $mongo_uri = get_option('captain_mongodb_uri', 'mongodb://localhost:27017');
            $client = new MongoDB\Client($mongo_uri);
            $db_name = get_option('captain_mongodb_name', 'captain_crm');
            $this->db = $client->selectDatabase($db_name);

            // Test connection
            $this->db->command(['ping' => 1]);

            $this->enabled = true;
            return true;
        } catch (Exception $e) {
            error_log('MongoDB Connection Error: ' . $e->getMessage());
            $this->enabled = false;
            return false;
        }
    }

    /**
     * Check if MongoDB integration is enabled and working
     *
     * @return bool
     */
    public function is_enabled() {
        return $this->enabled;
    }

    /**
     * Get MongoDB database instance
     *
     * @return MongoDB\Database|null
     */
    public function get_db() {
        return $this->db;
    }

    /**
     * Register MongoDB settings
     */
    public function register_settings() {
        // Add MongoDB section to the settings page
        add_settings_section(
            'captain_mongodb_settings',
            'MongoDB Settings',
            array($this, 'mongodb_settings_section_callback'),
            'captain-settings'
        );

        // Add settings fields
        add_settings_field(
            'captain_mongodb_enabled',
            'Enable MongoDB',
            array($this, 'mongodb_enabled_callback'),
            'captain-settings',
            'captain_mongodb_settings'
        );

        add_settings_field(
            'captain_mongodb_uri',
            'MongoDB URI',
            array($this, 'mongodb_uri_callback'),
            'captain-settings',
            'captain_mongodb_settings'
        );

        add_settings_field(
            'captain_mongodb_name',
            'Database Name',
            array($this, 'mongodb_name_callback'),
            'captain-settings',
            'captain_mongodb_settings'
        );

        // Register settings
        register_setting('captain_settings', 'captain_mongodb_enabled');
        register_setting('captain_settings', 'captain_mongodb_uri');
        register_setting('captain_settings', 'captain_mongodb_name');
    }

    /**
     * MongoDB settings section callback
     */
    public function mongodb_settings_section_callback() {
        echo '<p>Configure MongoDB integration for improved performance with large datasets.</p>';

        if ($this->is_enabled()) {
            echo '<p style="color: green;">MongoDB connection is active.</p>';
        } else {
            echo '<p style="color: red;">MongoDB connection is not active. Check your settings and ensure the MongoDB server is running.</p>';
        }
    }

    /**
     * MongoDB enabled setting callback
     */
    public function mongodb_enabled_callback() {
        $enabled = get_option('captain_mongodb_enabled', '0');
        echo '<input type="checkbox" id="captain_mongodb_enabled" name="captain_mongodb_enabled" value="1" ' . checked('1', $enabled, false) . '>';
        echo '<label for="captain_mongodb_enabled">Enable MongoDB integration</label>';
    }

    /**
     * MongoDB URI setting callback
     */
    public function mongodb_uri_callback() {
        $uri = get_option('captain_mongodb_uri', 'mongodb://localhost:27017');
        echo '<input type="text" id="captain_mongodb_uri" name="captain_mongodb_uri" value="' . esc_attr($uri) . '" class="regular-text">';
        echo '<p class="description">MongoDB connection URI (e.g., mongodb://username:password@localhost:27017)</p>';
    }

    /**
     * MongoDB database name setting callback
     */
    public function mongodb_name_callback() {
        $name = get_option('captain_mongodb_name', 'captain_crm');
        echo '<input type="text" id="captain_mongodb_name" name="captain_mongodb_name" value="' . esc_attr($name) . '">';
        echo '<p class="description">MongoDB database name</p>';
    }

    /**
     * Admin notice for missing MongoDB driver
     */
    public function missing_driver_notice() {
        ?>
        <div class="notice notice-error">
            <p>
                <strong>Captain CRM MongoDB Integration:</strong> The MongoDB PHP driver is not installed.
                Please run <code>composer install</code> in the plugin directory or install the MongoDB PHP extension.
            </p>
        </div>
        <?php
    }

    /**
     * Sync booking to MongoDB
     *
     * @param int $post_id The post ID
     * @param WP_Post $post The post object
     * @param bool $update Whether this is an update
     */
    public function sync_booking_to_mongodb($post_id, $post, $update) {
        if (!$this->is_enabled() || wp_is_post_revision($post_id)) {
            return;
        }

        try {
            // Get booking data
            $client_id = get_post_meta($post_id, '_booking_client_id', true);
            $start_date = get_post_meta($post_id, '_booking_start_date', true);
            $end_date = get_post_meta($post_id, '_booking_end_date', true);
            $service_type = get_post_meta($post_id, '_booking_service_type', true);
            $destination = get_post_meta($post_id, '_booking_destination', true);
            $price = get_post_meta($post_id, '_booking_price', true);
            $status_terms = get_the_terms($post_id, 'booking_status');
            $status = $status_terms ? $status_terms[0]->slug : '';
            $payment_status = get_post_meta($post_id, '_booking_payment_status', true);

            // Convert dates to MongoDB format
            $mongo_start_date = $start_date ? new MongoDB\BSON\UTCDateTime(strtotime($start_date) * 1000) : null;
            $mongo_end_date = $end_date ? new MongoDB\BSON\UTCDateTime(strtotime($end_date) * 1000) : null;

            // Prepare document
            $document = array(
                'wordpress_id' => $post_id,
                'client_id' => (int)$client_id,
                'title' => $post->post_title,
                'start_date' => $mongo_start_date,
                'end_date' => $mongo_end_date,
                'service_type' => $service_type,
                'destination' => $destination,
                'price' => floatval($price),
                'status' => $status,
                'payment_status' => $payment_status,
                'created_at' => new MongoDB\BSON\UTCDateTime(strtotime($post->post_date) * 1000),
                'updated_at' => new MongoDB\BSON\UTCDateTime(time() * 1000)
            );

            // Insert or update document
            $collection = $this->db->bookings;
            $result = $collection->updateOne(
                array('wordpress_id' => $post_id),
                array('$set' => $document),
                array('upsert' => true)
            );

            if ($result->getModifiedCount() > 0 || $result->getUpsertedCount() > 0) {
                update_post_meta($post_id, '_mongodb_synced', time());
            }
        } catch (Exception $e) {
            error_log('MongoDB Booking Sync Error: ' . $e->getMessage());
        }
    }

    /**
     * Sync client to MongoDB
     *
     * @param int $post_id The post ID
     * @param WP_Post $post The post object
     * @param bool $update Whether this is an update
     */
    public function sync_client_to_mongodb($post_id, $post, $update) {
        if (!$this->is_enabled() || wp_is_post_revision($post_id)) {
            return;
        }

        try {
            // Get client data
            $email = get_post_meta($post_id, '_client_email', true);
            $phone = get_post_meta($post_id, '_client_phone', true);
            $nationality = get_post_meta($post_id, '_client_nationality', true);
            $experience = get_post_meta($post_id, '_client_sailing_experience', true);
            $rating = get_post_meta($post_id, '_client_rating', true) ?: 5;
            $cancellations = get_post_meta($post_id, '_client_cancellations', true) ?: 0;

            // Prepare document
            $document = array(
                'wordpress_id' => $post_id,
                'name' => $post->post_title,
                'email' => $email,
                'phone' => $phone,
                'nationality' => $nationality,
                'sailing_experience' => $experience,
                'rating' => intval($rating),
                'cancellations' => intval($cancellations),
                'created_at' => new MongoDB\BSON\UTCDateTime(strtotime($post->post_date) * 1000),
                'updated_at' => new MongoDB\BSON\UTCDateTime(time() * 1000)
            );

            // Insert or update document
            $collection = $this->db->clients;
            $result = $collection->updateOne(
                array('wordpress_id' => $post_id),
                array('$set' => $document),
                array('upsert' => true)
            );

            if ($result->getModifiedCount() > 0 || $result->getUpsertedCount() > 0) {
                update_post_meta($post_id, '_mongodb_synced', time());
            }
        } catch (Exception $e) {
            error_log('MongoDB Client Sync Error: ' . $e->getMessage());
        }
    }

    /**
     * Delete document from MongoDB when post is deleted
     *
     * @param int $post_id The post ID
     */
    public function delete_document_from_mongodb($post_id) {
        if (!$this->is_enabled()) {
            return;
        }

        $post_type = get_post_type($post_id);
        if (!in_array($post_type, array('booking', 'client'))) {
            return;
        }

        try {
            $collection_name = $post_type . 's'; // 'bookings' or 'clients'
            $collection = $this->db->$collection_name;
            $collection->deleteOne(array('wordpress_id' => $post_id));
        } catch (Exception $e) {
            error_log('MongoDB Delete Error: ' . $e->getMessage());
        }
    }

    /**
     * Get client bookings from MongoDB
     *
     * @param int $client_id Client ID
     * @param string $status Booking status filter
     * @param int $limit Number of bookings to return
     * @param int $offset Offset for pagination
     * @return array|false Array of bookings or false on error
     */
    public function get_client_bookings($client_id, $status = 'all', $limit = 10, $offset = 0) {
        if (!$this->is_enabled()) {
            return false;
        }

        try {
            $collection = $this->db->bookings;
            $filter = array('client_id' => (int)$client_id);

            // Add status filter if needed
            if ($status !== 'all') {
                if ($status === 'upcoming') {
                    $filter['start_date'] = array('$gte' => new MongoDB\BSON\UTCDateTime(time() * 1000));
                } elseif ($status === 'past') {
                    $filter['start_date'] = array('$lt' => new MongoDB\BSON\UTCDateTime(time() * 1000));
                } else {
                    $filter['status'] = $status;
                }
            }

            $options = array(
                'limit' => (int)$limit,
                'skip' => (int)$offset,
                'sort' => array('start_date' => -1)
            );

            $cursor = $collection->find($filter, $options);
            return iterator_to_array($cursor);
        } catch (Exception $e) {
            error_log('MongoDB Query Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get calendar events from MongoDB
     *
     * @param string $start Start date
     * @param string $end End date
     * @param array $filters Additional filters
     * @return array|false Array of events or false on error
     */
    public function get_calendar_events($start, $end, $filters = array()) {
        if (!$this->is_enabled()) {
            return false;
        }

        try {
            $collection = $this->db->bookings;

            // Convert dates to MongoDB format
            $start_date = new MongoDB\BSON\UTCDateTime(strtotime($start) * 1000);
            $end_date = new MongoDB\BSON\UTCDateTime(strtotime($end) * 1000);

            $filter = array(
                '$or' => array(
                    // Event starts within the range
                    array(
                        'start_date' => array(
                            '$gte' => $start_date,
                            '$lte' => $end_date
                        )
                    ),
                    // Event ends within the range
                    array(
                        'end_date' => array(
                            '$gte' => $start_date,
                            '$lte' => $end_date
                        )
                    ),
                    // Event spans the entire range
                    array(
                        'start_date' => array('$lte' => $start_date),
                        'end_date' => array('$gte' => $end_date)
                    )
                )
            );

            // Add service type filter if provided
            if (!empty($filters['service'])) {
                $filter['service_type'] = $filters['service'];
            }

            // Add crew services filter if provided
            if (!empty($filters['crew'])) {
                $filter['crew_services'] = $filters['crew'];
            }

            $cursor = $collection->find($filter);

            $events = array();
            foreach ($cursor as $booking) {
                // Convert MongoDB dates back to strings
                $start_date_str = date('Y-m-d', $booking['start_date']->toDateTime()->getTimestamp());
                $end_date_str = isset($booking['end_date'])
                    ? date('Y-m-d', $booking['end_date']->toDateTime()->getTimestamp())
                    : $start_date_str;

                $events[] = array(
                    'id' => $booking['wordpress_id'],
                    'title' => $booking['title'],
                    'start' => $start_date_str,
                    'end' => $end_date_str,
                    'url' => admin_url('post.php?post=' . $booking['wordpress_id'] . '&action=edit')
                );
            }

            return $events;
        } catch (Exception $e) {
            error_log('MongoDB Calendar Query Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get report data from MongoDB
     *
     * @param int $year Year
     * @param int $month Month (0 for all months)
     * @param string $service Service type filter
     * @param string $destination Destination filter
     * @return array|false Report data or false on error
     */
    public function generate_report_data($year, $month = 0, $service = '', $destination = '') {
        if (!$this->is_enabled()) {
            return false;
        }

        try {
            $collection = $this->db->bookings;

            // Create date range
            $start_year = new DateTime("$year-01-01");
            $end_year = new DateTime("$year-12-31 23:59:59");

            $filter = array(
                'start_date' => array(
                    '$gte' => new MongoDB\BSON\UTCDateTime($start_year->getTimestamp() * 1000),
                    '$lte' => new MongoDB\BSON\UTCDateTime($end_year->getTimestamp() * 1000)
                )
            );

            // Add month filter if specified
            if ($month > 0) {
                $filter['$expr'] = array(
                    '$eq' => array(
                        array('$month' => '$start_date'),
                        (int)$month
                    )
                );
            }

            // Add service filter if specified
            if (!empty($service)) {
                $filter['service_type'] = $service;
            }

            // Add destination filter if specified
            if (!empty($destination)) {
                $filter['destination'] = $destination;
            }

            // Execute aggregation
            $pipeline = array(
                array('$match' => $filter),
                array(
                    '$group' => array(
                        '_id' => null,
                        'total_bookings' => array('$sum' => 1),
                        'total_revenue' => array('$sum' => '$price'),
                        'bookings' => array('$push' => '$$ROOT')
                    )
                )
            );

            $result = $collection->aggregate($pipeline)->toArray();

            if (empty($result)) {
                return $this->get_empty_report_data();
            }

            $data = $result[0];
            $report_data = array(
                'total_bookings' => $data['total_bookings'],
                'total_revenue' => $data['total_revenue'],
                'active_days' => 0,
                'service_stats' => array(),
                'destination_stats' => array(),
                'monthly_stats' => array()
            );

            // Process bookings for additional stats
            $active_days = array();
            $bookings = $data['bookings'];

            foreach ($bookings as $booking) {
                // Service stats
                $service_type = $booking['service_type'];
                if (!isset($report_data['service_stats'][$service_type])) {
                    $report_data['service_stats'][$service_type] = array(
                        'count' => 0,
                        'revenue' => 0
                    );
                }
                $report_data['service_stats'][$service_type]['count']++;
                $report_data['service_stats'][$service_type]['revenue'] += $booking['price'];

                // Destination stats
                $dest = $booking['destination'];
                if (!isset($report_data['destination_stats'][$dest])) {
                    $report_data['destination_stats'][$dest] = array(
                        'count' => 0,
                        'revenue' => 0
                    );
                }
                $report_data['destination_stats'][$dest]['count']++;
                $report_data['destination_stats'][$dest]['revenue'] += $booking['price'];

                // Monthly stats
                $booking_month = $booking['start_date']->toDateTime()->format('n');
                if (!isset($report_data['monthly_stats'][$booking_month])) {
                    $report_data['monthly_stats'][$booking_month] = array(
                        'count' => 0,
                        'revenue' => 0,
                        'days' => 0
                    );
                }
                $report_data['monthly_stats'][$booking_month]['count']++;
                $report_data['monthly_stats'][$booking_month]['revenue'] += $booking['price'];

                // Count active days
                $start = $booking['start_date']->toDateTime();
                $end = isset($booking['end_date']) ? $booking['end_date']->toDateTime() : $start;

                $interval = new DateInterval('P1D');
                $date_range = new DatePeriod($start, $interval, $end);

                foreach ($date_range as $date) {
                    $day_key = $date->format('Y-m-d');
                    if (!in_array($day_key, $active_days)) {
                        $active_days[] = $day_key;

                        // Track days by month
                        $curr_month = $date->format('n');
                        if (isset($report_data['monthly_stats'][$curr_month])) {
                            $report_data['monthly_stats'][$curr_month]['days']++;
                        }
                    }
                }

                // Also add the end date
                $day_key = $end->format('Y-m-d');
                if (!in_array($day_key, $active_days)) {
                    $active_days[] = $day_key;

                    // Track days by month
                    $curr_month = $end->format('n');
                    if (isset($report_data['monthly_stats'][$curr_month])) {
                        $report_data['monthly_stats'][$curr_month]['days']++;
                    }
                }
            }

            $report_data['active_days'] = count($active_days);

            return $report_data;
        } catch (Exception $e) {
            error_log('MongoDB Report Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get empty report data structure
     *
     * @return array
     */
    private function get_empty_report_data() {
        return array(
            'total_bookings' => 0,
            'total_revenue' => 0,
            'active_days' => 0,
            'service_stats' => array(),
            'destination_stats' => array(),
            'monthly_stats' => array()
        );
    }

    /**
     * Create initial indexes in MongoDB
     */
    public function create_indexes() {
        if (!$this->is_enabled()) {
            return;
        }

        try {
            // Bookings collection indexes
            $this->db->bookings->createIndex(['wordpress_id' => 1], ['unique' => true]);
            $this->db->bookings->createIndex(['client_id' => 1]);
            $this->db->bookings->createIndex(['start_date' => 1]);
            $this->db->bookings->createIndex(['end_date' => 1]);
            $this->db->bookings->createIndex(['service_type' => 1]);
            $this->db->bookings->createIndex(['destination' => 1]);
            $this->db->bookings->createIndex(['status' => 1]);

            // Clients collection indexes
            $this->db->clients->createIndex(['wordpress_id' => 1], ['unique' => true]);
            $this->db->clients->createIndex(['email' => 1], ['unique' => true]);

            return true;
        } catch (Exception $e) {
            error_log('MongoDB Index Creation Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Sync all existing data to MongoDB
     */
    public function sync_all_data() {
        if (!$this->is_enabled()) {
            return false;
        }

        // Sync clients
        $clients = get_posts(array(
            'post_type' => 'client',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        ));

        foreach ($clients as $client) {
            $this->sync_client_to_mongodb($client->ID, $client, true);
        }

        // Sync bookings
        $bookings = get_posts(array(
            'post_type' => 'booking',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        ));

        foreach ($bookings as $booking) {
            $this->sync_booking_to_mongodb($booking->ID, $booking, true);
        }

        return true;
    }
}

// Initialize MongoDB integration
function captain_mongodb_init() {
    // Only initialize if MongoDB is enabled
    if (get_option('captain_mongodb_enabled', '0') === '1') {
        return Captain_MongoDB_Integration::get_instance();
    }
    return null;
}

// Hook to initialize MongoDB integration after plugins are loaded
add_action('plugins_loaded', 'captain_mongodb_init');