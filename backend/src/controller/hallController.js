import { Hall } from "../models/Hall.js";
import { HallMessage } from "../models/HallMessage.js";
import { Song } from "../models/song.model.js";
import { User } from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

// Get user's halls (created and joined)
export const getMyHalls = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Get halls created by user
    const myHalls = await Hall.find({ adminId: userId })
      .populate("currentSong.songId", "title artist imageUrl duration audioUrl")
      .sort({ createdAt: -1 });

    // Get halls user is a member of
    const joinedHalls = await Hall.find({
      "members.userId": userId,
      adminId: { $ne: userId }
    })
      .populate("currentSong.songId", "title artist imageUrl duration audioUrl")
      .sort({ createdAt: -1 });

    // Get admin details for all halls
    const allHalls = [...myHalls, ...joinedHalls];
    const adminIds = [...new Set(allHalls.map(hall => hall.adminId))];
    const adminUsers = await User.find({ clerkId: { $in: adminIds } });

    // Add admin details to halls
    const enrichHalls = (halls) => halls.map(hall => {
      const adminUser = adminUsers.find(user => user.clerkId === hall.adminId);
      return {
        ...hall.toObject(),
        adminId: {
          _id: hall.adminId,
          fullName: adminUser?.fullName || 'Admin',
          name: adminUser?.fullName || 'Admin',
          imageUrl: adminUser?.imageUrl || '/default-avatar.png',
          avatar: adminUser?.imageUrl || '/default-avatar.png'
        },
        memberCount: hall.members.length,
        queueLength: hall.queue?.length || 0
      };
    });

    res.json({
      myHalls: enrichHalls(myHalls),
      joinedHalls: enrichHalls(joinedHalls)
    });
  } catch (error) {
    console.error("Error fetching halls:", error);
    res.status(500).json({ message: "Error fetching halls" });
  }
};

// Get single hall details
export const getHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId)
      .populate("currentSong.songId", "title artist imageUrl duration audioUrl albumId")
      .populate("queue.songId", "title artist imageUrl duration audioUrl");

    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    // Check if user is member or admin
    const isMember = hall.members.some(member => member.userId === userId) ||
      hall.adminId === userId;

    if (hall.type === "private" && !isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get admin details
    const adminUser = await User.findOne({ clerkId: hall.adminId });

    // Get member details with real user data
    const memberUserIds = hall.members.map(member => member.userId);
    const memberUsers = await User.find({ clerkId: { $in: memberUserIds } });

    const membersWithStatus = hall.members.map(member => {
      const userData = memberUsers.find(user => user.clerkId === member.userId);
      // Check if user is actually online (has active socket connection)
      const isOnline = req.app.get('io')?.sockets?.sockets ?
        Array.from(req.app.get('io').sockets.sockets.values())
          .some(socket => socket.handshake?.auth?.userId === member.userId) : false;

      return {
        _id: member.userId,
        fullName: userData?.fullName || `User ${member.userId.slice(-4)}`,
        name: userData?.fullName || `User ${member.userId.slice(-4)}`,
        imageUrl: userData?.imageUrl || '/default-avatar.png',
        avatar: userData?.imageUrl || '/default-avatar.png',
        isOnline,
        lastSeen: isOnline ? new Date() : new Date(Date.now() - Math.random() * 86400000)
      };
    });

    // Log current song details for debugging
    console.log(`[HallController] Fetching hall ${hallId}`);
    console.log(`[HallController] Current Song in DB:`, JSON.stringify(hall.currentSong, null, 2));

    res.json({
      ...hall.toObject(),
      adminId: {
        _id: hall.adminId,
        fullName: adminUser?.fullName || 'Admin',
        name: adminUser?.fullName || 'Admin',
        imageUrl: adminUser?.imageUrl || '/default-avatar.png',
        avatar: adminUser?.imageUrl || '/default-avatar.png'
      },
      members: membersWithStatus,
      memberCount: hall.members.length,
      onlineCount: membersWithStatus.filter(m => m.isOnline).length,
      queueLength: hall.queue.length
    });
  } catch (error) {
    console.error("Error fetching hall:", error);
    res.status(500).json({ message: "Error fetching hall" });
  }
};

// Create new hall
export const createHall = async (req, res) => {
  try {
    console.log('=== CREATE HALL REQUEST ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('Request auth:', req.auth);

    const { name, description, type } = req.body;
    const userId = req.auth?.userId;

    console.log('Extracted data:', { name, description, type, userId });

    if (!name || !userId) {
      console.log('Missing required data');
      return res.status(400).json({ message: "Name and user ID are required" });
    }

    let coverImageUrl = "/albums/album1.jpg"; // Default cover image

    // Handle cover image upload if provided
    if (req.file) {
      console.log('File uploaded successfully:', req.file);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }

      // Cloudinary multer storage sets the path to the secure_url
      coverImageUrl = req.file.path;
      console.log('Using uploaded image:', coverImageUrl);

      // Verify the URL is valid
      if (!coverImageUrl || !coverImageUrl.startsWith('http')) {
        console.error('Invalid Cloudinary URL:', coverImageUrl);
        coverImageUrl = "/albums/album1.jpg";
      }
    } else {
      console.log('No file uploaded, using default image');
    }

    const hall = new Hall({
      name: name.trim(),
      description: description?.trim() || "",
      type: type || "public",
      coverImage: coverImageUrl,
      adminId: userId,
      members: [{ userId }] // Admin is automatically a member
    });

    // Ensure admin is always in members array (data repair after clearing)
    if (!hall.members.some(member => member.userId === userId)) {
      hall.members.push({ userId });
    }

    await hall.save();

    console.log('Hall created successfully:', hall._id);

    // Return hall with populated admin info
    const populatedHall = await Hall.findById(hall._id).populate("currentSong.songId", "title artist imageUrl duration audioUrl");
    res.status(201).json(populatedHall);
  } catch (error) {
    console.error("Error creating hall:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Error creating hall", error: error.message });
  }
};

// Update hall
export const updateHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { name, description, type } = req.body;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    if (hall.adminId !== userId) {
      return res.status(403).json({ message: "Only admin can update hall" });
    }

    // Handle image upload if provided
    if (req.file) {
      console.log('Updating hall with image upload:', req.file);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }

      try {
        // Use multer storage which already handles Cloudinary upload
        hall.name = name?.trim() || hall.name;
        hall.description = description?.trim() || hall.description;
        hall.type = type || hall.type;
        hall.coverImage = req.file.path; // Cloudinary secure_url from multer

        // Verify the URL is valid
        if (!hall.coverImage || !hall.coverImage.startsWith('http')) {
          console.error('Invalid Cloudinary URL:', hall.coverImage);
          hall.coverImage = "/albums/album1.jpg";
        }

        await hall.save();

        // Return populated hall
        const populatedHall = await Hall.findById(hallId).populate("currentSong.songId", "title artist imageUrl duration audioUrl");
        res.json(populatedHall);
        return;

      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    // Update without image
    hall.name = name?.trim() || hall.name;
    hall.description = description?.trim() || hall.description;
    hall.type = type || hall.type;

    await hall.save();

    // Return populated hall
    const populatedHall = await Hall.findById(hallId).populate("currentSong.songId", "title artist imageUrl duration audioUrl");
    res.json(populatedHall);
  } catch (error) {
    console.error("Error updating hall:", error);
    res.status(500).json({ message: "Error updating hall" });
  }
};

// Delete hall
export const deleteHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    if (hall.adminId !== userId) {
      return res.status(403).json({ message: "Only admin can delete hall" });
    }

    // Delete all messages
    await HallMessage.deleteMany({ hallId });

    // Delete hall
    await Hall.findByIdAndDelete(hallId);

    res.json({ message: "Hall deleted successfully" });
  } catch (error) {
    console.error("Error deleting hall:", error);
    res.status(500).json({ message: "Error deleting hall" });
  }
};

// Join hall
export const joinHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    // Check if already a member
    const isMember = hall.members.some(member => member.userId === userId);
    if (isMember) {
      return res.status(400).json({ message: "Already a member" });
    }

    // For private halls, check if user follows the admin
    if (hall.type === 'private') {
      const currentUser = await User.findOne({ clerkId: userId });
      const adminUser = await User.findOne({ clerkId: hall.adminId });

      const canJoin = currentUser?.following?.includes(adminUser?._id) ||
        adminUser?.followers?.includes(currentUser?._id);

      if (!canJoin) {
        return res.status(403).json({ message: "You must follow the hall admin to join this private hall" });
      }
    }

    hall.members.push({ userId });
    await hall.save();

    // Get user details for system message
    const user = await User.findOne({ clerkId: userId });
    const userName = user?.fullName || `User ${userId.slice(-4)}`;

    // Create system message
    const systemMessage = new HallMessage({
      hallId,
      senderId: userId,
      senderName: userName,
      content: `${userName} joined the hall`,
      messageType: "system"
    });
    await systemMessage.save();

    res.json({ message: "Joined hall successfully" });
  } catch (error) {
    console.error("Error joining hall:", error);
    res.status(500).json({ message: "Error joining hall" });
  }
};

// Get public halls for discovery
export const getPublicHalls = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const userId = req.auth.userId;

    // Sanitize and validate inputs
    const sanitizedSearch = typeof search === 'string' ? search.trim().slice(0, 100) : '';
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

    // Get current user to check following/followers for private halls
    const currentUser = await User.findOne({ clerkId: userId }).lean();

    // Get admin user IDs that current user follows or is followed by
    const followingAdminIds = [];
    if (currentUser?.following?.length > 0) {
      const followingUsers = await User.find({
        _id: { $in: currentUser.following }
      }).select('clerkId').lean();
      followingAdminIds.push(...followingUsers.map(user => user.clerkId));
    }

    // Also check users who follow the current user (mutual visibility)
    const followersUsers = await User.find({
      following: currentUser?._id
    }).select('clerkId').lean();
    followingAdminIds.push(...followersUsers.map(user => user.clerkId));

    let query = {
      $or: [
        { type: 'public' },
        {
          type: 'private',
          adminId: { $in: followingAdminIds }
        }
      ]
    };

    // Add search filter if provided (with proper escaping)
    if (sanitizedSearch) {
      const escapedSearch = sanitizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchConditions = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } }
      ];

      query = {
        $and: [
          query,
          { $or: searchConditions }
        ]
      };
    }

    const halls = await Hall.find(query)
      .populate("currentSong.songId", "title artist imageUrl duration audioUrl")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    // Filter out halls user is already a member of
    const filteredHalls = halls.filter(hall =>
      hall.adminId !== userId &&
      !hall.members.some(member => member.userId === userId)
    );

    // Get admin details
    const adminIds = [...new Set(filteredHalls.map(hall => hall.adminId))];
    const adminUsers = await User.find({ clerkId: { $in: adminIds } });

    // Enrich halls with admin details
    const enrichedHalls = filteredHalls.map(hall => {
      const adminUser = adminUsers.find(user => user.clerkId === hall.adminId);
      return {
        ...hall,
        adminId: {
          _id: hall.adminId,
          fullName: adminUser?.fullName || 'Admin',
          name: adminUser?.fullName || 'Admin',
          imageUrl: adminUser?.imageUrl || '/default-avatar.png',
          avatar: adminUser?.imageUrl || '/default-avatar.png'
        },
        memberCount: hall.members.length,
        queueLength: hall.queue?.length || 0
      };
    });

    res.json(enrichedHalls);
  } catch (error) {
    console.error('Error fetching public halls:', error);
    res.status(500).json({ message: 'Error fetching public halls' });
  }
};

// Leave hall
export const leaveHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    if (hall.adminId === userId) {
      return res.status(400).json({ message: "Admin cannot leave hall. Delete hall instead." });
    }

    hall.members = hall.members.filter(member => member.userId !== userId);
    await hall.save();

    // Get user details for system message
    const user = await User.findOne({ clerkId: userId });
    const userName = user?.fullName || `User ${userId.slice(-4)}`;

    // Create system message
    const systemMessage = new HallMessage({
      hallId,
      senderId: userId,
      senderName: userName,
      content: `${userName} left the hall`,
      messageType: "system"
    });
    await systemMessage.save();

    res.json({ message: "Left hall successfully" });
  } catch (error) {
    console.error("Error leaving hall:", error);
    res.status(500).json({ message: "Error leaving hall" });
  }
};