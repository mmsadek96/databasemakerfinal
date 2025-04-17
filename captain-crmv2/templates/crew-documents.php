<?php
// Create a new file: templates/crew-documents.php

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="captain-documents-manager">
    <h3>My Documents</h3>

    <div class="document-tabs">
        <button class="document-tab-btn active" data-tab="document-list">My Documents</button>
        <button class="document-tab-btn" data-tab="upload-document">Upload New Document</button>
    </div>

    <div id="document-list" class="document-tab-content active">
        <?php if (empty($documents)): ?>
            <p>You haven't uploaded any documents yet.</p>
        <?php else: ?>
            <div class="documents-table-container">
                <table class="documents-table">
                    <thead>
                        <tr>
                            <th>Document Type</th>
                            <th>Date Uploaded</th>
                            <th>Expiry Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($documents as $index => $document):
                            $download_url = $this->get_document_download_url($employee_id, $index);
                            $expiry_date = !empty($document['expiry_date']) ? date('F j, Y', strtotime($document['expiry_date'])) : 'N/A';
                            $expired = !empty($document['expiry_date']) && strtotime($document['expiry_date']) < current_time('timestamp');
                        ?>
                        <tr<?php echo $expired ? ' class="expired"' : ''; ?>>
                            <td><?php echo esc_html($document['type']); ?></td>
                            <td><?php echo date('F j, Y', strtotime($document['date_uploaded'])); ?></td>
                            <td>
                                <?php echo esc_html($expiry_date); ?>
                                <?php if ($expired): ?>
                                <span class="expired-label">Expired</span>
                                <?php endif; ?>
                            </td>
                            <td class="document-actions">
                                <a href="<?php echo esc_url($download_url); ?>" class="button download-document" download>Download</a>
                                <button class="button delete-document" data-index="<?php echo $index; ?>">Delete</button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>

    <div id="upload-document" class="document-tab-content">
        <div class="upload-form-container">
            <form id="document-upload-form" enctype="multipart/form-data">
                <div class="form-row">
                    <div class="form-group">
                        <label for="document_type" class="required-field">Document Type</label>
                        <select id="document_type" name="document_type" required>
                            <option value="">Select Document Type</option>
                            <option value="Passport">Passport</option>
                            <option value="Seamans Book">Seaman's Book</option>
                            <option value="Captain License">Captain's License</option>
                            <option value="STCW Certificate">STCW Certificate</option>
                            <option value="Medical Certificate">Medical Certificate</option>
                            <option value="First Aid Certificate">First Aid Certificate</option>
                            <option value="Resume CV">Resume/CV</option>
                            <option value="Other Certificate">Other Certificate</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="document_file" class="required-field">Document File</label>
                        <input type="file" id="document_file" name="document_file" required>
                        <p class="description">Accepted file types: PDF, DOC, DOCX, JPG, PNG (Max size: 10MB)</p>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="expiry_date">Expiry Date (if applicable)</label>
                        <input type="date" id="expiry_date" name="expiry_date">
                    </div>
                </div>

                <input type="hidden" name="employee_id" value="<?php echo $employee_id; ?>">
                <input type="hidden" name="action" value="captain_upload_document">
                <?php wp_nonce_field('captain_document_nonce', 'document_nonce'); ?>

                <div class="form-submit">
                    <button type="submit" class="submit-button">Upload Document</button>
                </div>
            </form>

            <div id="upload-progress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-bar-fill"></div>
                </div>
                <p class="progress-text">Uploading... 0%</p>
            </div>

            <div id="upload-response"></div>
        </div>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    // Tab switching
    $('.document-tab-btn').on('click', function() {
        var tab = $(this).data('tab');

        // Update active tab
        $('.document-tab-btn').removeClass('active');
        $(this).addClass('active');

        // Show corresponding content
        $('.document-tab-content').removeClass('active');
        $('#' + tab).addClass('active');
    });

    // Document upload form submission
    $('#document-upload-form').on('submit', function(e) {
        e.preventDefault();

        var $form = $(this);
        var $uploadProgress = $('#upload-progress');
        var $uploadResponse = $('#upload-response');

        // Check file size
        var file = document.getElementById('document_file').files[0];
        if (file && file.size > 10 * 1024 * 1024) {
            $uploadResponse.html('<p class="error">File is too large. Maximum size: 10MB</p>');
            return;
        }

        // Prepare form data
        var formData = new FormData(this);
        formData.append('nonce', captain_ajax.nonce);

        // Reset response and show progress
        $uploadResponse.html('');
        $uploadProgress.show();

        // Disable form during upload
        $form.find('button').prop('disabled', true);

        // Send AJAX request
        $.ajax({
            url: captain_ajax.ajax_url,
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            xhr: function() {
                var xhr = new window.XMLHttpRequest();

                // Add progress event listener
                xhr.upload.addEventListener('progress', function(e) {
                    if (e.lengthComputable) {
                        var percent = Math.round((e.loaded / e.total) * 100);
                        $('.progress-bar-fill').width(percent + '%');
                        $('.progress-text').text('Uploading... ' + percent + '%');
                    }
                }, false);

                return xhr;
            },
            success: function(response) {
                // Hide progress bar
                $uploadProgress.hide();

                if (response.success) {
                    // Show success message
                    $uploadResponse.html('<p class="success">' + response.data.message + '</p>');

                    // Reset form
                    $form[0].reset();

                    // Reload page after short delay to show updated document list
                    setTimeout(function() {
                        window.location.reload();
                    }, 1500);
                } else {
                    // Show error message
                    $uploadResponse.html('<p class="error">' + response.data + '</p>');
                }

                // Re-enable form
                $form.find('button').prop('disabled', false);
            },
            error: function() {
                // Hide progress bar
                $uploadProgress.hide();

                // Show error message
                $uploadResponse.html('<p class="error">An error occurred. Please try again.</p>');

                // Re-enable form
                $form.find('button').prop('disabled', false);
            }
        });
    });

    // Document deletion
    $('.delete-document').on('click', function() {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        var $button = $(this);
        var index = $button.data('index');

        $button.prop('disabled', true).text('Deleting...');

        $.ajax({
            url: captain_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'captain_delete_document',
                document_index: index,
                employee_id: <?php echo $employee_id; ?>,
                nonce: captain_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    // Remove row from table
                    $button.closest('tr').fadeOut(function() {
                        $(this).remove();

                        // If no documents left, show message
                        if ($('.documents-table tbody tr').length === 0) {
                            $('#document-list').html('<p>You haven\'t uploaded any documents yet.</p>');
                        }
                    });
                } else {
                    alert('Error: ' + response.data);
                    $button.prop('disabled', false).text('Delete');
                }
            },
            error: function() {
                alert('An error occurred. Please try again.');
                $button.prop('disabled', false).text('Delete');
            }
        });
    });
});
</script>

<style>
.captain-documents-manager {
    max-width: 900px;
    margin: 20px auto;
}

.document-tabs {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 1px solid #ddd;
}

.document-tab-btn {
    padding: 10px 20px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-weight: 500;
}

.document-tab-btn.active {
    border-bottom-color: #2b6cb0;
    color: #2b6cb0;
}

.document-tab-content {
    display: none;
}

.document-tab-content.active {
    display: block;
}

.documents-table-container {
    overflow-x: auto;
}

.documents-table {
    width: 100%;
    border-collapse: collapse;
}

.documents-table th,
.documents-table td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
}

.documents-table th {
    background-color: #f7fafc;
    font-weight: 600;
}

.documents-table tr.expired {
    background-color: #fff5f5;
}

.expired-label {
    display: inline-block;
    padding: 2px 6px;
    font-size: 12px;
    background-color: #e53e3e;
    color: white;
    border-radius: 3px;
    margin-left: 8px;
}

.document-actions {
    display: flex;
    gap: 8px;
}

.button {
    display: inline-block;
    padding: 6px 12px;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
    font-size: 14px;
}

.button.delete-document {
    background: #e53e3e;
}

.form-row {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 20px;
    gap: 20px;
}

.form-group {
    flex: 1;
    min-width: 250px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.form-group .description {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
}

.form-submit {
    margin-top: 20px;
}

.submit-button {
    padding: 10px 20px;
    background: #2b6cb0;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
}

#upload-progress {
    margin-top: 20px;
}

.progress-bar {
    height: 20px;
    background-color: #edf2f7;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
}

.progress-bar-fill {
    height: 100%;
    background-color: #2b6cb0;
    width: 0%;
    transition: width 0.3s ease;
}

#upload-response {
    margin-top: 15px;
}

#upload-response .success {
    color: #38a169;
}

#upload-response .error {
    color: #e53e3e;
}

.required-field:after {
    content: "*";
    color: #e53e3e;
    margin-left: 4px;
}
</style>