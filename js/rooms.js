// TODO(fancycode): Should load through AMD if possible.
/* global OC, OCA */

(function(OCA, OC, $) {
	'use strict';

	OCA.SpreedMe = OCA.SpreedMe || {};

	function initRooms() {

		var editRoomname = $('#edit-roomname');
		editRoomname.keyup(function () {
			editRoomname.tooltip('hide');
			editRoomname.removeClass('error');
		});
	}

	var currentRoomId = 0;
	var roomChannel = Backbone.Radio.channel('rooms');

	OCA.SpreedMe.Rooms = {
		showCamera: function() {
			$('.videoView').removeClass('hidden');
		},
		createOneToOneVideoCall: function(recipientUserId) {
			console.log(recipientUserId);
			$.ajax({
				url: OC.generateUrl('/apps/spreed/api/oneToOne'),
				type: 'PUT',
				data: 'targetUserName='+recipientUserId,
				success: function(data) {
					OCA.SpreedMe.Rooms.join(data.roomId);
				}
			});
		},
		join: function(roomId) {
			$('#emptycontent').hide();
			$('.videoView').addClass('hidden');
			$('#app-content').addClass('icon-loading');
			$('li[data-id="'+roomId+'"]').addClass('active');

			currentRoomId = roomId;
			OCA.SpreedMe.webrtc.joinRoom(roomId);
			roomChannel.trigger('active', roomId);
			OCA.SpreedMe.Rooms.ping();
		},
		currentRoom: function() {
			return currentRoomId;
		},
		peers: function(roomId) {
			return $.ajax({
				url: OC.generateUrl('/apps/spreed/api/room/{roomId}/peers', {roomId: roomId})
			});
		},
		ping: function() {
			$.post(
				OC.generateUrl('/apps/spreed/api/ping'),
				{
					currentRoom: OCA.SpreedMe.Rooms.currentRoom()
				}
			);
		}
	};

	$(document).click(function(e) {
	    var target = e.target;
	    // Hide all more-actions menus
	    $('.app-navigation-entry-menu').each(function() {
			$(this).removeClass("open");
		});
	    // Open more-actions menu from selected row
	    if ($(target).is('.icon-more')) {
	    	if (!$(target).parent().parent().find('.app-navigation-entry-menu').hasClass("open")) {
	    		$(target).parent().parent().find('.app-navigation-entry-menu').addClass("open");
	    	};
	    }
	});

	OCA.SpreedMe.initRooms = initRooms;

})(OCA, OC, $);
