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
                loadClientBookings('all');
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
                loadEmployeeSchedule('all');
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
            loadClientBookings(status);
        } else if ($('.employee-dashboard').length) {
            loadEmployeeSchedule(status);
        }
    });
    
    // Initial load based on which dashboard is present
    if ($('.client-dashboard').length) {
        loadClientBookings('all');
    } else if ($('.employee-dashboard').length) {
        loadEmployeeSchedule('all');
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

// Client Dashboard Functions
function loadClientBookings(status) {
    var clientId = jQuery('.client-dashboard').data('client-id');
    jQuery('#client-bookings-list').html('<p>Loading your bookings...</p>');
    
    jQuery.ajax({
        url: captain_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'captain_get_client_bookings',
            client_id: clientId,
            status: status,
            nonce: captain_ajax.nonce
        },
        success: function(response) {
            if (response.success) {
                jQuery('#client-bookings-list').html(response.data);
            } else {
                jQuery('#client-bookings-list').html('<p class="error">Error: ' + response.data + '</p>');
            }
        },
        error: function() {
            jQuery('#client-bookings-list').html('<p class="error">An error occurred. Please try again.</p>');
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

// Employee Dashboard Functions
function loadEmployeeSchedule(status) {
    jQuery('#employee-schedule-list').html('<p>Loading your schedule...</p>');
    
    jQuery.ajax({
        url: captain_ajax.ajax_url,
        type: 'POST',
        data: {
            action: 'captain_get_employee_bookings',
            employee_id: 0, // 0 means current user
            status: status,
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