import { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import { Hall } from "../models/Hall.js";

export const initializeSocket = (io) => {
	const userSockets = new Map(); // { userId: socketId}
	const userActivities = new Map(); // {userId: activity}
	const hallMembers = new Map(); // { hallId: Set(userIds) }
	const hallSyncStates = new Map(); // { hallId: { timestamp, position, isPlaying } }
	const connectionThrottle = new Map(); // { userId: lastConnectionTime }

	io.on("connection", (socket) => {
		// Enhanced error handling for socket connections
		socket.on('error', (error) => {
			console.error('Socket error:', error);
		});

		socket.on("user_connected", (userId) => {
			try {
				if (!userId || typeof userId !== 'string') {
					socket.emit('error', { message: 'Invalid user ID' });
					return;
				}

				// Throttle rapid connections
				const now = Date.now();
				const lastConnection = connectionThrottle.get(userId);
				if (lastConnection && now - lastConnection < 1000) {
					return; // Ignore rapid reconnections within 1 second
				}
				connectionThrottle.set(userId, now);

				// Disconnect existing socket for this user
				const existingSocketId = userSockets.get(userId);
				if (existingSocketId && existingSocketId !== socket.id) {
					const existingSocket = io.sockets.sockets.get(existingSocketId);
					if (existingSocket) {
						existingSocket.disconnect();
					}
				}

				socket.handshake.auth = { userId }; // Store userId in socket auth
				userSockets.set(userId, socket.id);
				userActivities.set(userId, "Idle");

				console.log('User connected:', userId, 'socket:', socket.id);

				// broadcast to all connected sockets that this user just logged in
				io.emit("user_connected", userId);

				socket.emit("users_online", Array.from(userSockets.keys()));

				io.emit("activities", Array.from(userActivities.entries()));
			} catch (error) {
				console.error('Error in user_connected:', error);
				socket.emit('error', { message: 'Connection failed' });
			}
		});

		// Hall-specific events with enhanced error handling
		socket.on("join_hall", (hallId) => {
			try {
				if (!hallId || typeof hallId !== 'string') {
					socket.emit('error', { message: 'Invalid hall ID' });
					return;
				}

				socket.join(`hall_${hallId}`);
				const userId = socket.handshake.auth?.userId;
				if (userId) {
					if (!hallMembers.has(hallId)) {
						hallMembers.set(hallId, new Set());
					}
					hallMembers.get(hallId).add(userId);

					// Send current hall sync state to joining user
					if (hallSyncStates.has(hallId)) {
						const syncState = hallSyncStates.get(hallId);
						socket.emit('hall:sync-state', {
							hallId,
							...syncState
						});
					}

					// Broadcast updated online count to hall
					io.to(`hall_${hallId}`).emit("hall_online_update", {
						onlineCount: hallMembers.get(hallId).size
					});
				}
				console.log(`User ${userId} joined hall ${hallId}`);
			} catch (error) {
				console.error('Error joining hall:', error);
				socket.emit('error', { message: 'Failed to join hall' });
			}
		});

		socket.on("leave_hall", (hallId) => {
			socket.leave(`hall_${hallId}`);
			const userId = socket.handshake.auth?.userId;
			if (userId && hallMembers.has(hallId)) {
				hallMembers.get(hallId).delete(userId);
				if (hallMembers.get(hallId).size === 0) {
					hallMembers.delete(hallId);
					hallSyncStates.delete(hallId); // Clean up sync state when empty
				} else {
					// Broadcast updated online count to hall
					io.to(`hall_${hallId}`).emit("hall_online_update", {
						onlineCount: hallMembers.get(hallId).size
					});
				}
			}
			console.log(`User ${userId} left hall ${hallId}`);
		});

		// --- Hall Sync Events ---

		socket.on("hall:update-playback", async ({ hallId, playbackState }) => {
			try {
				const userId = socket.handshake.auth?.userId;
				// Verify user is admin (optional but recommended for security)
				// For now, we trust the client logic that only admin emits this

				// Update in-memory state
				const currentSyncState = hallSyncStates.get(hallId) || {};
				hallSyncStates.set(hallId, { ...currentSyncState, ...playbackState });

				// Broadcast to everyone in the hall EXCEPT sender
				socket.to(`hall_${hallId}`).emit("hall:playback-sync", playbackState);

				// Persist to DB (fire-and-forget)
				Hall.findByIdAndUpdate(hallId, {
					playbackState: {
						isPlaying: playbackState.isPlaying,
						position: playbackState.position,
						timestamp: new Date()
					}
				}).catch(err => console.error("Error persisting playback state:", err));

			} catch (error) {
				console.error("Error in hall:update-playback:", error);
			}
		});

		socket.on("hall:change-song", async ({ hallId, song }) => {
			try {
				console.log(`[Socket] Hall ${hallId} changed song request received`);
				console.log('[Socket] Song data:', JSON.stringify(song, null, 2));

				const songId = song._id || song.id;
				if (!songId) {
					console.error('[Socket] Invalid song data received (missing _id and id):', song);
					return;
				}

				console.log('[Socket] Processing song change for hall:', hallId);
				console.log('[Socket] Song ID to save:', songId);

				// Update in-memory state
				const currentSyncState = hallSyncStates.get(hallId) || {};
				hallSyncStates.set(hallId, {
					...currentSyncState,
					currentSong: song,
					position: 0,
					isPlaying: true
				});

				// Broadcast to ALL users in hall (including sender to confirm)
				io.to(`hall_${hallId}`).emit("hall:song-changed", song);

				// Persist to DB
				console.log('[Socket] Persisting to DB for hall:', hallId);

				// Explicitly cast to ObjectId to ensure Mongoose saves it correctly
				const mongoose = require('mongoose');
				const objectId = new mongoose.Types.ObjectId(songId);

				const updateResult = await Hall.findByIdAndUpdate(hallId, {
					"currentSong.songId": objectId,
					"currentSong.startedAt": new Date(),
					"currentSong.position": 0,
					"playbackState.isPlaying": true,
					"playbackState.position": 0,
					"playbackState.timestamp": new Date()
				}, { new: true }); // new: true to return updated doc

				if (updateResult) {
					console.log('[Socket] DB updated successfully. Current song in DB:', updateResult.currentSong);
				} else {
					console.error('[Socket] Failed to find hall to update:', hallId);
				}

			} catch (error) {
				console.error("Error in hall:change-song:", error);
			}
		});

		socket.on("hall_message", (data) => {
			const { hallId, message } = data;
			// Broadcast message to all hall members
			socket.to(`hall_${hallId}`).emit("hall_message_received", message);
		});

		socket.on("hall_typing", (data) => {
			const { hallId, isTyping, userName } = data;
			socket.to(`hall_${hallId}`).emit("hall_typing_update", { isTyping, userName });
		});

		socket.on("update_activity", ({ userId, activity }) => {
			console.log("activity updated", userId, activity);
			userActivities.set(userId, activity);
			io.emit("activity_updated", { userId, activity });
		});

		socket.on("profile_updated", (updatedUser) => {
			console.log("profile updated", updatedUser.clerkId);
			io.emit("profile_updated", updatedUser);
		});

		socket.on("follow_request", (data) => {
			const { targetUserId, requesterId, requesterName, requesterImageUrl } = data;
			console.log('Socket received follow_request:', data);
			const targetSocketId = userSockets.get(targetUserId);
			console.log('Target socket ID for', targetUserId, ':', targetSocketId);
			if (targetSocketId) {
				console.log('Emitting follow_request to target socket');
				io.to(targetSocketId).emit("follow_request", {
					requesterId,
					requesterName,
					requesterImageUrl,
				});
			} else {
				console.log('No target socket found for user:', targetUserId);
			}
		});

		socket.on("follow_accepted", (data) => {
			const { requesterId, accepterId, accepterName, accepterImageUrl } = data;
			const requesterSocketId = userSockets.get(requesterId);
			if (requesterSocketId) {
				io.to(requesterSocketId).emit("follow_accepted", {
					accepterId,
					accepterName,
					accepterImageUrl,
				});
			}
		});

		socket.on("follow_back_request", (data) => {
			const { targetUserId, requesterId, requesterName, requesterImageUrl } = data;
			const targetSocketId = userSockets.get(targetUserId);
			if (targetSocketId) {
				io.to(targetSocketId).emit("follow_back_request", {
					requesterId,
					requesterName,
					requesterImageUrl,
				});
			}
		});

		socket.on("follow_back_available", (data) => {
			const { userId, userName, userImageUrl } = data;
			const socketId = userSockets.get(socket.handshake?.auth?.userId);
			if (socketId) {
				io.to(socketId).emit("follow_back_available", {
					userId,
					userName,
					userImageUrl,
				});
			}
		});

		socket.on("send_message", async (data) => {
			try {
				const { senderId, receiverId, content } = data;

				const message = await Message.create({
					senderId,
					receiverId,
					content,
				});

				// send to receiver in realtime, if they're online
				const receiverSocketId = userSockets.get(receiverId);
				if (receiverSocketId) {
					io.to(receiverSocketId).emit("receive_message", message);
				}

				socket.emit("message_sent", message);
			} catch (error) {
				console.error("Message error:", error);
				socket.emit("message_error", error.message);
			}
		});

		socket.on("disconnect", () => {
			let disconnectedUserId;
			for (const [userId, socketId] of userSockets.entries()) {
				// find disconnected user
				if (socketId === socket.id) {
					disconnectedUserId = userId;
					userSockets.delete(userId);
					userActivities.delete(userId);
					// Remove from all halls
					for (const [hallId, members] of hallMembers.entries()) {
						if (members.has(userId)) {
							members.delete(userId);
							if (members.size === 0) {
								hallMembers.delete(hallId);
							} else {
								io.to(`hall_${hallId}`).emit("hall_online_update", {
									onlineCount: members.size
								});
							}
						}
					}
					break;
				}
			}
			if (disconnectedUserId) {
				io.emit("user_disconnected", disconnectedUserId);
			}
		});
	});
};
