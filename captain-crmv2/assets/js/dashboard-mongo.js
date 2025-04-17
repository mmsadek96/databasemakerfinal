jQuery(document).ready(function($) {
    // Tab switching for both dashboards
    $('.tab-item').on('click', function() {
        var tab = $(this).data('tab');

        // Update active tab
        $('.tab-item').removeClass('active');
        $(this).addClass('active');

        // Show corresponding content
        $('.tab-content').removeClass('active');
        $('#' + tab + '-tab').addClass('active');

        // Load content if needed
        if ($('.client-dashboard').length) {
            // Client dashboard
            if (tab === 'bookings') {
                loadClientBookings('all', 1); // Load first page
            } else if (tab === 'contracts') {
                loadClientContracts();
            } else if (tab === 'payments') {
                loadClientPayments();
            } else if (tab === 'profile') {
                loadClientProfile();
            }
        } else if ($('.employee-dashboard').length) {
            // Employee dashboard
            if (tab === 'schedule') {
                loadEmployeeSchedule('all', 1); // Load first page
            } else if (tab === 'payments') {
                loadEmployeePayments();
            } else if (tab === 'profile') {
                loadEmployeeProfile();
            }
        }
    });

    // Filter buttons
    $('.filter-button').on('click', function() {
        $('.filter-button').removeClass('active');
        $(this).addClass('active');

        var status = $(this).data('status');

        if ($('.client-dashboard').length) {
            loadClientBookings(status, 1); // Load first page with new filter
        } else if ($('.employee-dashboard').length) {
            loadEmployeeSchedule(status, 1); // Load first page with new filter
        }
    });

    // Handle pagination clicks
    $(document).on('click', '.load-more-button', function() {
        var page = $(this).data('page');
        var status = $(this).data('status');

        if ($('.client-dashboard').length) {
            var clientId = $(this).data('client');
            loadClientBookings(status, page, clientId);
        } else if ($('.employee-dashboard').length) {
            loadEmployeeSchedule(status, page);
        }
    });

    // Initial load based on which dashboard is present
    if ($('.client-dashboard').length) {
        loadClientBookings('all', 1);
    } else if ($('.employee-dashboard').length) {
        loadEmployeeSchedule('all', 1);
    }

    // Tip request and link copy functionality
    $(document).on('click', '.request-tip-btn', function() {
        var bookingId = $(this).data('booking');
        var clientId = $(this).data('client');
        var $button = $(this);

        if (confirm('Are you sure you want to send a tip request to this client?')) {
            $button.prop('disabled', true).text('Processing...');

            $.ajax({
                url: captain_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'captain_create_tip_request',
                    booking_id: bookingId,
                    client_id: clientId,
                    nonce: captain_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        $button.replaceWith('<p class="tip-status pending">Tip requested - Awaiting payment</p><button type="button" class="copy-tip-link" data-booking="' + bookingId + '">Copy Tip Link</button>');
                    } else {
                        alert('Error: ' + response.data);
                        $button.prop('disabled', false).text('Request Tip');
                    }
                },
                error: function() {
                    alert('An error occurred. Please try again.');
                    $button.prop('disabled', false).text('Request Tip');
                }
            });
        }
    });

    $(document).on('click', '.copy-tip-link', function() {
        var bookingId = $(this).data('booking');
        var $button = $(this);

        $.ajax({
            url: captain_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'captain_get_tip_link',
                booking_id: bookingId,
                nonce: captain_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    // Create temporary input to copy to clipboard
                    var $temp = $('<input>');
                    $('body').append($temp);
                    $temp.val(response.data).select();
                    document.execCommand('copy');
                    $temp.remove();

                    $button.text('Link Copied!');
                    setTimeout(function() {
                        $button.text('Copy Tip Link');
                    }, 3000);
                } else {
                    alert('Error: ' + response.data);
                }
            },
            error: function() {
                alert('An error occurred. Please try again.');
            }
        });
    });
});

// Client Dashboard Functions with pagination
function loadClientBookings(status, page, clientId) {
    if (!clientId) {
        clientId = jQuery('.client-dashboard').data('client-id');
    }

    var $container = jQuery('#client-bookings-list');
    var loadingMsg = '<p>Loading your bookings...</p>';

    // If loading more pages, append instead of replacing content
    if (page > 1) {
        // Only show loading indicator for new content
        var $loadingIndicator = jQuery('<div class="loading-more">' + loadingMsg + '</div>');
        jQuery('.pagination').replaceWith($loadingIndicator);
    } else {
        $container.html(loadingMsg);
    }

    jQuery.ajax({
        url: captain_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'captain_get_client_bookings',
            client_id: clientId,
            status: status,
            page: page,
            nonce: captain_ajax.nonce
        },
        success: function(response) {
            if (response.success) {
                if (page > 1) {
                    // Remove loading indicator
                    jQuery('.loading-more').remove();

                    // Remove existing pagination
                    jQuery('.pagination').remove();

                    // Append new content
                    var $newContent = jQuery(response.data);
                    var $bookingItems = $newContent.filter('.booking-item, .booking-item *');
                    var $pagination = $newContent.filter('.pagination');

                    jQuery('.bookings-list').append($bookingItems);
                    if ($pagination.length) {
                        jQuery('.bookings-list').after($pagination);
                    }
                } else {
                    $container.html(response.data);
                }

                // Update pagination buttons with status info
                jQuery('.load-more-button').attr('data-status', status);
            } else {
                if (page > 1) {
                    jQuery('.loading-more').html('<p class="error">Error: ' + response.data + '</p>');
                } else {
                    $container.html('<p class="error">Error: ' + response.data + '</p>');
                }
            }
        },
        error: function() {
            if (page > 1) {
                jQuery('.loading-more').html('<p class="error">An error occurred. Please try again.</p>');
            } else {
                $container.html('<p class="error">An error occurred. Please try again.</p>');
            }
        }
    });
}

function loadClientContracts() {
    var clientId = jQuery('.client-dashboard').data('client-id');
    jQuery('#client-contracts-list').html('<p>Loading contracts...</p>');

    jQuery.ajax({
        url: captain_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'captain_get_client_contracts',
            client_id: clientId,
            nonce: captain_ajax.nonce
        },
        success: function(response) {
            if (response.success) {
                jQuery('#client-contracts-list').html(response.data);
            } else {
                jQuery('#client-contracts-list').html('<p class="error">Error: ' + response.data + '</p>');
            }
        },
        error: function() {
            jQuery('#client-contracts-list').html('<p class="error">An error occurred. Please try again.</p>');
        }
    });
}

function loadClientPayments() {
    var clientId = jQuery('.client-dashboard').data('client-id');
    jQuery('#client-payments-list').html('<p>Loading payment history...</p>');

    jQuery.ajax({
        url: captain_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'captain_get_client_payments',
            client_id: clientId,
            nonce: captain_ajax.nonce
        },
        success: function(response) {
            if (response.success) {
                jQuery('#client-payments-list').html(response.data);
            } else {
                jQuery('#client-payments-list').html('<p class="error">Error: ' + response.data + '</p>');
            }
        },
        error: function() {
            jQuery('#client-payments-list').html('<p class="error">An error occurred. Please try again.</p>');
        }
    });
}

function loadClientProfile() {
    var clientId = jQuery('.client-dashboard').data('client-id');
    jQuery('#client-profile-info').html('<p>Loading profile...</p>');

    jQuery.ajax({
        url: captain_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'captain_get_client_profile',
            client_id: clientId,
            nonce: captain_ajax.nonce
        },
        success: function(response) {
            if (response.success) {
                jQuery('#client-profile-info').html(response.data);
            } else {
                jQuery('#client-profile-info').html('<p class="error">Error: ' + response.data + '</p>');
            }
        },
        error: function() {
            jQuery('#client-profile-info').html('<p class="error">An error occurred. Please try again.</p>');
        }
    });
}

// Employee Dashboard Functions with pagination support
function loadEmployeeSchedule(status, page) {
    jQuery('#employee-schedule-list').html('<p>Loading your schedule...</p>');

    jQuery.ajax({
        url: captain_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'captain_get_employee_bookings',
            employee_id: 0, // 0 means current user
            status: status,
            page: page,
            nonce: captain_ajax.nonce
        },
        success: function(response) {
            if (response.success) {
                jQuery('#employee-schedule-list').html(response.data);
            } else {
                jQuery('#employee-schedule-list').html('<p class="error">Error: ' + response.data + '</p>');
            }
        },
        error: function() {
            jQuery('#employee-schedule-list').html('<p class="error">An error occurred. Please try again.</p>');
        }
    });
}

function loadEmployeePayments() {
    jQuery('#employee-payments-list').html('<p>Loading payment history...</p>');

    jQuery.ajax({
        url: captain_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'captain_get_employee_payments',
            employee_id: 0, // 0 means current user
            nonce: captain_ajax.nonce
        },
        success: function(response) {
            if (response.success) {
                jQuery('#employee-payments-list').html(response.data);
            } else {
                jQuery('#employee-payments-list').html('<p class="error">Error: ' + response.data + '</p>');
            }
        },
        error: function() {
            jQuery('#employee-payments-list').html('<p class="error">An error occurred. Please try again.</p>');
        }
    });
}

function loadEmployeeProfile() {
    jQuery('#employee-profile-info').html('<p>Loading profile...</p>');

    jQuery.ajax({
        url: captain_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'captain_get_employee_profile',
            employee_id: 0, // 0 means current user
            nonce: captain_ajax.nonce
        },
        success: function(response) {
            if (response.success) {
                jQuery('#employee-profile-info').html(response.data);
            } else {
                jQuery('#employee-profile-info').html('<p class="error">Error: ' + response.data + '</p>');
            }
        },
        error: function() {
            jQuery('#employee-profile-info').html('<p class="error">An error occurred. Please try again.</p>');
        }
    });
}