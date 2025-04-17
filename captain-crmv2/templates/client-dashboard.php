<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Get client info
$client_name = get_the_title($client_id);
?>

<div class="captain-dashboard client-dashboard" data-client-id="<?php echo intval($client_id); ?>">
    <h1>Welcome, <?php echo esc_html($client_name); ?></h1>
    
    <div class="dashboard-navigation">
        <ul class="dashboard-tabs">
            <li class="tab-item active" data-tab="bookings">My Bookings</li>
            <li class="tab-item" data-tab="contracts">Contracts</li>
            <li class="tab-item" data-tab="payments">Payments</li>
            <li class="tab-item" data-tab="profile">Profile</li>
        </ul>
    </div>
    
    <div class="dashboard-content">
        <div id="bookings-tab" class="tab-content active">
            <h2>My Bookings</h2>
            
            <div class="booking-filters">
                <button type="button" class="filter-button active" data-status="all">All Bookings</button>
                <button type="button" class="filter-button" data-status="upcoming">Upcoming</button>
                <button type="button" class="filter-button" data-status="past">Past</button>
            </div>
            
            <div id="client-bookings-list" class="loading">
                <p>Loading your bookings...</p>
            </div>
        </div>
        
        <div id="contracts-tab" class="tab-content">
            <h2>Contracts</h2>
            <div id="client-contracts-list" class="loading">
                <p>Loading contracts...</p>
            </div>
        </div>
        
        <div id="payments-tab" class="tab-content">
            <h2>Payments</h2>
            <div id="client-payments-list" class="loading">
                <p>Loading payment history...</p>
            </div>
        </div>
        
        <div id="profile-tab" class="tab-content">
            <h2>Profile</h2>
            <div id="client-profile-info" class="loading">
                <p>Loading profile...</p>
            </div>
        </div>
    </div>
</div>