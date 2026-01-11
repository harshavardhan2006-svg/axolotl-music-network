import { HallMessage } from "../models/HallMessage.js";
import { Hall } from "../models/Hall.js";
import { User } from "../models/user.model.js";

// Get hall messages
export const getHallMessages = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.auth.userId;

    console.log(`getHallMessages called for hall ${hallId} by user ${userId}`);

    // Check if user is member of hall
    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    let isMember = hall.members.some(member => member.userId === userId) ||
      hall.adminId === userId;

    // Ensure admin always has access to their own hall (fixes data clearing issues)
    if (hall.adminId === userId) {
      isMember = true;
    }

    if (!isMember) {
      console.log(`Access denied for user ${userId} to hall ${hallId}`);
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await HallMessage.find({
      hallId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get user details for all message senders
    const senderIds = [...new Set(messages.map(msg => msg.senderId))];
    const senderUsers = await User.find({ clerkId: { $in: senderIds } });

    // Format messages for frontend
    const formattedMessages = messages.reverse().map(msg => {
      const senderUser = senderUsers.find(user => user.clerkId === msg.senderId);
      return {
        _id: msg._id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.senderName || senderUser?.fullName || `User ${msg.senderId.slice(-4)}`,
        senderAvatar: senderUser?.imageUrl || '/default-avatar.png',
        timestamp: msg.createdAt,
        replyTo: msg.replyTo,
        messageType: msg.messageType
      };
    });

    res.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({ message: "Error fetching messages", error: error.message });
  }
};

// Send message
export const sendHallMessage = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { content, replyToId } = req.body;
    const userId = req.auth.userId;

    // Sanitize content
    const sanitizedContent = content.trim().slice(0, 1000);
    if (!sanitizedContent) {
      return res.status(400).json({ message: "Message content is required" });
    }

    // Check if user is member of hall
    const hall = await Hall.findById(hallId).lean();
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    let isMember = hall.members.some(member => member.userId === userId) ||
      hall.adminId === userId;

    // Ensure admin always has access to their own hall (fixes data clearing issues)
    if (hall.adminId === userId) {
      isMember = true;
    }

    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get sender user details
    const senderUser = await User.findOne({ clerkId: userId }).select('fullName imageUrl').lean();
    const senderName = senderUser?.fullName || `User ${userId.slice(-4)}`;

    let replyTo = null;
    if (replyToId) {
      const replyMessage = await HallMessage.findById(replyToId).lean();
      if (replyMessage && replyMessage.hallId.toString() === hallId) {
        const replyUser = await User.findOne({ clerkId: replyMessage.senderId }).select('fullName').lean();
        replyTo = {
          messageId: replyMessage._id,
          content: replyMessage.content.substring(0, 100),
          senderName: replyMessage.senderName || replyUser?.fullName || `User ${replyMessage.senderId.slice(-4)}`
        };
      }
    }

    const message = new HallMessage({
      hallId,
      senderId: userId,
      senderName,
      content: sanitizedContent,
      replyTo
    });

    await message.save();

    const formattedMessage = {
      _id: message._id,
      content: message.content,
      senderId: message.senderId,
      senderName,
      senderAvatar: senderUser?.imageUrl || '/default-avatar.png',
      timestamp: message.createdAt,
      replyTo: message.replyTo,
      messageType: message.messageType
    };

    // Broadcast message to all hall members via socket
    if (req.io) {
      req.io.to(`hall_${hallId}`).emit('hall_message_received', formattedMessage);
    }

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message" });
  }
};

// Delete message
export const deleteHallMessage = async (req, res) => {
  try {
    const { hallId, messageId } = req.params;
    const userId = req.auth.userId;

    const message = await HallMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const hall = await Hall.findById(hallId);
    const isAdmin = hall.adminId === userId;
    const isOwner = message.senderId === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    message.isDeleted = true;
    await message.save();

    // Broadcast deletion to all hall members
    if (req.io) {
      req.io.to(`hall_${hallId}`).emit('hall_message_deleted', {
        messageId,
        hallId
      });
    }

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Error deleting message" });
  }
};