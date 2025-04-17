(function($) {
    'use strict';

    $(document).ready(function() {
        console.log('Captain CRM Booking Form JS Loaded');

        // Date validation - Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        $('#start-date').attr('min', today);

        // When start date changes, update end date min value
        $('#start-date').on('change', function() {
            const startDate = $(this).val();
            if (startDate) {
                $('#end-date').attr('min', startDate);

                // If end date is before start date, clear it
                if ($('#end-date').val() && $('#end-date').val() < startDate) {
                    $('#end-date').val('');
                }
            }
        });

        // Booking form submission
        $('#captain-inquiry-form').on('submit', function(e) {
            e.preventDefault();

            console.log('Form submitted');

            var $form = $(this);
            var $response = $('#form-response');
            var $submitButton = $form.find('.submit-button');

            // Disable submit button and show loading state
            $submitButton.prop('disabled', true).css('opacity', '0.7').text('Processing...');

            // Clear previous messages
            $response.html('');

            // Show loading
            $response.html('<div class="response-loading"><div class="loader"></div>Processing your inquiry...</div>');

            // Get form data
            var formData = $form.serialize();

            // Send AJAX request
            $.ajax({
                type: 'POST',
                url: captain_ajax.ajax_url,
                data: formData,
                dataType: 'json',
                success: function(response) {
                    console.log('AJAX success:', response);

                    if (response.success) {
                        $response.html('<div class="response-success">' + response.data + '</div>');
                        $form[0].reset();

                        // Scroll to response
                        $('html, body').animate({
                            scrollTop: $response.offset().top - 100
                        }, 500);
                    } else {
                        $response.html('<div class="response-error">' + response.data + '</div>');
                    }

                    // Re-enable submit button
                    $submitButton.prop('disabled', false).css('opacity', '1').text('Submit Booking Inquiry');
                },
                error: function(xhr, status, error) {
                    console.log('AJAX Error:', xhr.responseText);
                    $response.html('<div class="response-error">An error occurred. Please try again later or contact us directly.</div>');

                    // Re-enable submit button
                    $submitButton.prop('disabled', false).css('opacity', '1').text('Submit Booking Inquiry');
                }
            });
        });
    });

})(jQuery);