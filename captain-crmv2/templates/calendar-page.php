<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="wrap">
    <h1>Booking Calendar</h1>

    <div class="calendar-filters">
        <select id="calendar-service-filter">
            <option value="">All Service Types</option>
            <option value="charter">Private Charter</option>
            <option value="flotilla">Flotilla Leading</option>
            <option value="instruction">Sailing Instruction</option>
            <option value="delivery">Yacht Delivery</option>
        </select>

        <select id="calendar-crew-filter">
            <option value="">All Crew Services</option>
            <option value="captain">Captain Only</option>
            <option value="chef">Chef Only</option>
            <option value="both">Captain and Chef</option>
            <option value="none">No Crew Services</option>
        </select>

        <button id="apply-calendar-filters" class="button">Apply Filters</button>
    </div>

    <div id="booking-calendar"></div>
</div>