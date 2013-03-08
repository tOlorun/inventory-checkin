$(function() {
    toastr.options = {
        // docs: http://codeseven.github.com/toastr/
	    debug: false,
	    positionClass: 'toast-top-left',
        fadeIn: 500,
        fadeOut: 1000,
        onclick: null
	};
    
    var $checkoutModal = $('#co-modal');
    var $personSelect = $('#person-list');
    var $inventoryMeta = $('#inventory-meta');
    
    // top banner <select> element
    $('#group-list').change(function() {
        this.form.submit();
    });
    
    // inventory row clicked
    $('#inventory .item-data').click(function() {
        // check permissions
        if ($inventoryMeta.data('can-edit') == 'no')
            return;
            
        var $row = $(this).parents('tr');
        var checkedOut = ($row.data('checked-out') == 'yes');
        if (checkedOut) {
            // start check-in workflow
            sendInventoryChangeState($row, {'checked': false});
        } else { 
            // show the check-out modal
            $('#co-modal-label').html($row.data('device-name'));
            $checkoutModal.data('item-id', $row.data('item-id'));
            
            $checkoutModal.modal('show');
        }
    });
    
    // checkout button in modal clicked
    $('#co-btn-checkout').click(function() {
        $row = $('#item-'+$checkoutModal.data('item-id'));
        
        // set the needed person data
        var personId = $personSelect.val();
        if (!parseInt(personId)) {
            alert('Please select a person.');
            return;
        }
            
        $row.data('person-id', personId);
        var personName = $personSelect.find('option:selected').text();
        $row.data('person-name', personName);
        
        sendInventoryChangeState($row, {'checked': true});
        $row.data('checked-out', 'yes');
        
        $checkoutModal.modal('hide');
    });
    
    function sendInventoryChangeState($row, params) {
        var personid = $row.data('person-id');
        // if no person selected
        if (!parseInt(personid)) {
            $row.data('checked-out', 'no');
            return;
        }

        var itemName = $row.data('device-name');
        var personName = $row.data('person-name');
        var itemid = $row.data('item-id');
        var checked = params.checked;

        // if about to be checked in
        if (!checked) {
            var confirmMsg = $.sprintf('Check in %s\nAre you sure?', itemName);
            if ($inventoryMeta.data('confirmation-checkin') == 'yes' &&
                confirm(confirmMsg) === false) {
                    $row.data('checked-out', 'yes');
                    return;
                }
        }

        // post check in/out change
        $.ajax({
            url: '/inventory-update',
            type: 'POST',
            data : {
                'personid' : personid,
                'itemid' : itemid,
                'status' : (checked ? 2 /* check out */ : 1 /* check in */)
            },
            success: function(req, status, xhr) {
                // show the notification
                toastr.options.fadeOut = 1000;
                toastr.options.timeOut = 3000;
                // change visual/func type based on action
                toastr[checked ? 'info' : 'success']($.sprintf(
                    '%s<br />Checked <b><u>%s</u> %s</b>', 
                    personName, 
                    checked ? 'OUT' : 'IN', 
                    itemName
                ));
                
                updateInventoryRow($row, checked);
            },
            error: function(req, status) {
                // show the error, it persists
                toastr.options.fadeOut = 0;
                toastr.options.timeOut = 0;
                toastr.error($.sprintf(
                    '%s <b>unable</b> to check %s %s',
                    personName,
                    checked ? 'out' : 'in', 
                    itemName
                ), 'error');

                // make sure the attempted state change is reverted
                $row.data('checked-out', !checkedOut ? 'yes' : 'no');
            }
        });
    }
    
    function updateInventoryRow($row, checkedOut) {
        $row.data('checked-out', checkedOut ? 'yes' : 'no');
        $row.find('.item-data').toggleClass('btn-inverse');
        $row.find('.person').toggleClass('hidden');
    }
});