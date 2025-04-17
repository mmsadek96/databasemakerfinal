jQuery(document).ready(function ($) {
    // Check if the calendar container exists
    if ($('#booking-calendar').length) {
        // Initialize FullCalendar
        var calendarEl = document.getElementById('booking-calendar');
        var calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            // Fetch events via AJAX based on current view dates and filters
            events: function (info, successCallback, failureCallback) {
                $.ajax({
                    url: captainCalendar.ajaxurl,
                    method: 'POST',
                    data: {
                        action: 'captain_get_calendar_events',
                        start: info.startStr,
                        end: info.endStr,
                        service: $('#calendar-service-filter').val(),
                        crew: $('#calendar-crew-filter').val(),
                        nonce: captainCalendar.nonce
                    },
                    success: function (response) {
                        if (response.success) {
                            // Pass event data to FullCalendar
                            successCallback(response.data);
                        } else {
                            failureCallback(response.data);
                        }
                    },
                    error: function () {
                        failureCallback('Error fetching events.');
                    }
                });
            },
            // Optional: handle event clicks to open event details
            eventClick: function (info) {
                if (info.event.url) {
                    window.open(info.event.url, '_blank');
                    info.jsEvent.preventDefault();
                }
            }
        });
        // Render the calendar
        calendar.render();

        // Re-fetch events when filters are applied
        $('#apply-calendar-filters').on('click', function (e) {
            e.preventDefault();
            calendar.refetchEvents();
        });
    }
});
