<?php
// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="captain-booking-form">
    <form id="captain-inquiry-form" method="post">
        <h3>Yacht Charter Booking Inquiry</h3>

        <div class="form-row">
            <div class="form-group">
                <label for="client-name" class="required-field">Full Name</label>
                <input type="text" id="client-name" name="client_name" placeholder="Enter your full name" required>
            </div>

            <div class="form-group">
                <label for="client-email" class="required-field">Email Address</label>
                <input type="email" id="client-email" name="client_email" placeholder="your.email@example.com" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="client-phone" class="required-field">Phone Number</label>
                <input type="tel" id="client-phone" name="client_phone" placeholder="+1 (123) 456-7890" required>
            </div>

            <div class="form-group">
                <label for="client-nationality">Nationality</label>
                <input type="text" id="client-nationality" name="client_nationality" placeholder="Your nationality">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="service-type" class="required-field">Service Type</label>
                <select id="service-type" name="service_type" required>
                    <option value="">Select a Service</option>
                    <option value="charter">Private Charter</option>
                    <option value="flotilla">Flotilla Leader</option>
                    <option value="instruction">Sailing Instruction</option>
                    <option value="delivery">Yacht Delivery</option>
                </select>
            </div>

            <div class="form-group">
                <label for="crew-services" class="required-field">Crew Services</label>
                <select id="crew-services" name="crew_services" required>
                    <option value="">Select Required Crew</option>
                    <option value="captain">Captain Only</option>
                    <option value="chef">Chef Only</option>
                    <option value="both">Captain and Chef</option>
                    <option value="none">No Crew Services</option>
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="destination" class="required-field">Destination</label>
                <select id="destination" name="destination" required>
                    <option value="">Select a Destination</option>
                    <option value="greece">Greece</option>
                    <option value="bvi">British Virgin Islands</option>
                    <option value="croatia">Croatia</option>
                    <option value="italy">Italy</option>
                    <option value="spain">Spain</option>
                    <option value="turkey">Turkey</option>
                    <option value="other">Other</option>
                </select>
            </div>

            <div class="form-group">
                <label for="crew-size">Number of Guests</label>
                <input type="number" id="crew-size" name="crew_size" min="1" max="20" value="2">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="start-date" class="required-field">Start Date</label>
                <input type="date" id="start-date" name="start_date" required>
            </div>

            <div class="form-group">
                <label for="end-date">End Date</label>
                <input type="date" id="end-date" name="end_date">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="experience">Sailing Experience</label>
                <select id="experience" name="experience">
                    <option value="">Select Experience Level</option>
                    <option value="none">None</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                </select>
            </div>
        </div>

        <div class="form-group">
            <label for="message">Additional Information</label>
            <textarea id="message" name="message" rows="4" placeholder="Tell us about your preferences, special requirements, or any questions you might have..."></textarea>
        </div>

        <div class="form-submit">
            <input type="hidden" name="action" value="captain_process_booking_form">
            <?php wp_nonce_field('captain_booking_nonce', 'booking_nonce'); ?>
            <button type="submit" class="submit-button">Submit Booking Inquiry</button>
        </div>
    </form>
    <div id="form-response"></div>
</div>