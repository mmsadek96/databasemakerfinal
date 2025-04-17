<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Get current user
$current_user = wp_get_current_user();
$user_name = $current_user->display_name;
?>

<div class="captain-dashboard employee-dashboard">
    <h1>Welcome, <?php echo esc_html($user_name); ?></h1>
    
    <div class="dashboard-navigation">
        <ul class="dashboard-tabs">
            <li class="tab-item active" data-tab="schedule">My Schedule</li>
            <li class="tab-item" data-tab="payments">Payment History</li>
            <li class="tab-item" data-tab="documents">My Documents</li>
            <li class="tab-item" data-tab="profile">Profile</li>
        </ul>
    </div>

    <div class="dashboard-content">
        <div id="schedule-tab" class="tab-content active">
            <h2>My Schedule</h2>

            <div class="schedule-filters">
                <button type="button" class="filter-button active" data-status="all">All Assignments</button>
                <button type="button" class="filter-button" data-status="upcoming">Upcoming</button>
                <button type="button" class="filter-button" data-status="past">Past</button>
            </div>

            <div id="employee-schedule-list" class="loading">
                <p>Loading your schedule...</p>
            </div>
        </div>

        <div id="payments-tab" class="tab-content">
            <h2>Payment History</h2>
            <div id="employee-payments-list" class="loading">
                <p>Loading payment history...</p>
            </div>
        </div>

        <div id="documents-tab" class="tab-content">
            <h2>My Documents</h2>
            <?php
            if (shortcode_exists('captain_crew_documents')) {
                echo do_shortcode('[captain_crew_documents]');
            } else {
                echo '<p>Document management is not currently available.</p>';
            }
            ?>
        </div>
        
        <div id="profile-tab" class="tab-content">
            <h2>Profile</h2>
            <div id="employee-profile-info" class="loading">
                <p>Loading profile...</p>
            </div>
        </div>
    </div>
</div>