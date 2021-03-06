// TODO(fancycode): Should load through AMD if possible.
/* global SimpleWebRTC, OC, OCA: false */

var webrtc;

(function(OCA, OC) {
	'use strict';

	OCA.SpreedMe = OCA.SpreedMe || {};

	/**
	 * @private
	 */
	function openEventSource() {
		// Connect to the messages endpoint and pull for new messages
		var messageEventSource = new OC.EventSource(OC.generateUrl('/apps/spreed/messages'));
		var previousUsersInRoom = [];
		Array.prototype.diff = function(a) {
			return this.filter(function(i) {
				return a.indexOf(i) < 0;
			});
		};
		messageEventSource.listen('usersInRoom', function(users) {
			var currentUsersInRoom = [];
			users.forEach(function(user) {
				currentUsersInRoom.push(user['userId']);
			});

			if (currentUsersInRoom.length !== previousUsersInRoom.length) {
				$('#app-content').attr('class', '');
				$('#app-content').addClass('participants-' + currentUsersInRoom.length);
			}

			var disconnectedUsers = previousUsersInRoom.diff(currentUsersInRoom);
			disconnectedUsers.forEach(function(user) {
				OCA.SpreedMe.webrtc.removePeers(user);
			});
			previousUsersInRoom = currentUsersInRoom;
		});

		messageEventSource.listen('message', function(message) {
			message = JSON.parse(message);
			var peers = self.webrtc.getPeers(message.from, message.roomType);
			var peer;

			if (message.type === 'offer') {
				if (peers.length) {
					peers.forEach(function(p) {
						if (p.sid === message.sid) {
							peer = p;
						}
					});
				}
				if (!peer) {
					peer = self.webrtc.createPeer({
						id: message.from,
						sid: message.sid,
						type: message.roomType,
						enableDataChannels: false,
						sharemyscreen: message.roomType === 'screen' && !message.broadcaster,
						broadcaster: message.roomType === 'screen' && !message.broadcaster ? self.connection.getSessionid() : null
					});
					OCA.SpreedMe.webrtc.emit('createdPeer', peer);
				}
				peer.handleMessage(message);
			} else if (peers.length) {
				peers.forEach(function(peer) {
					if (message.sid) {
						if (peer.sid === message.sid) {
							peer.handleMessage(message);
						}
					} else {
						peer.handleMessage(message);
					}
				});
			}
		});
	}

	function initWebRTC() {
		'use strict';

		webrtc = new SimpleWebRTC({
			localVideoEl: 'localVideo',
			remoteVideosEl: '',
			autoRequestMedia: true,
			debug: false,
			autoAdjustMic: false,
			detectSpeakingEvents: true,
			connection: OCA.SpreedMe.XhrConnection,
			supportDataChannel: true
		});
		OCA.SpreedMe.webrtc = webrtc;

		OCA.SpreedMe.webrtc.on('localMediaError', function(error) {
			console.log("Access to local media failed", error);
			var message, messageAdditional;
			if (error.name === "NotAllowedError") {
				if (error.message && error.message.indexOf("Only secure origins") !== -1) {
					message = t('spreed', 'Access to microphone & camera is only possible with HTTPS');
					messageAdditional = t('spreed', 'Please adjust your configuration');
				} else {
					message = t('spreed', 'Access to microphone & camera was denied');
					$('#emptycontent p').hide();
				}
			} else {
				message = t('spreed', 'Error while accessing local media: {error}', {error: error.message || error.name});
				$('#emptycontent p').hide();
			}
			$('#emptycontent h2').text(message);
			$('#emptycontent p').text(messageAdditional);
		});

		OCA.SpreedMe.webrtc.on('joinedRoom', function() {
			$('#app-content').removeClass('icon-loading');
			$('.videoView').removeClass('hidden');
			openEventSource();
			OCA.SpreedMe.app.syncRooms();
		});

		OCA.SpreedMe.webrtc.on('videoAdded', function(video, peer) {
			console.log('video added', peer);
			var remotes = document.getElementById('remotes');
			if (remotes) {
				// Indicator for username
				var userIndicator = document.createElement('div');
				userIndicator.className = 'nameIndicator';
				userIndicator.textContent = peer.id;

				// Generic container
				var container = document.createElement('div');
				container.className = 'videoContainer';
				container.id = 'container_' + OCA.SpreedMe.webrtc.getDomId(peer);
				container.appendChild(video);
				container.appendChild(userIndicator);
				video.oncontextmenu = function() {
					return false;
				};
				remotes.appendChild(container);
			}
		});

		// a peer was removed
		OCA.SpreedMe.webrtc.on('videoRemoved', function(video, peer) {
			var remotes = document.getElementById('remotes');
			var el = document.getElementById(peer ? 'container_' + OCA.SpreedMe.webrtc.getDomId(peer) : 'localScreenContainer');
			if (remotes && el) {
				remotes.removeChild(el);
			}
		});
	}

	OCA.SpreedMe.initWebRTC = initWebRTC;

})(OCA, OC);