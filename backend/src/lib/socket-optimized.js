import { Server } from "socket.io";
import { Message } from "../models/message.model.js";

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
					return;
				}
				connectionThrottle.set(userId, now);

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
				} else {
					// Broadcast updated online count to hall
					io.to(`hall_${hallId}`).emit("hall_online_update", {
						onlineCount: hallMembers.get(hallId).size
					});
				}
			}
			console.log(`User ${userId} left hall ${hallId}`);
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
					connectionThrottle.delete(userId);
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