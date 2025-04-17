(function($) {
    'use strict';

    $(document).ready(function() {
        // Admin area functionality

        // Dynamic client info in booking edit screen
        $('#booking_client_id').on('change', function() {
            var clientId = $(this).val();
            if (clientId) {
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'captain_get_client_details',
                        client_id: clientId,
                        nonce: captainAdmin.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            $('.client-info').html(response.data);
                        }
                    }
                });
            } else {
                $('.client-info').html('');
            }
        });

        // Initialize datepickers if they exist
        if ($.fn.datepicker && $('.datepicker').length) {
            $('.datepicker').datepicker({
                dateFormat: 'yy-mm-dd'
            });
        }
    });
})(jQuery);