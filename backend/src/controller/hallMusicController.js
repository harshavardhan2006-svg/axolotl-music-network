import { Hall } from "../models/Hall.js";
import { Song } from "../models/song.model.js";
import { HallMessage } from "../models/HallMessage.js";
import { User } from "../models/user.model.js";

// Play song in hall
export const playHallSong = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { songId, position = 0 } = req.body;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    if (hall.adminId !== userId) {
      return res.status(403).json({ message: "Only admin can control playback" });
    }

    const song = await Song.findById(songId).populate("albumId");
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    // Update hall state
    hall.currentSong = {
      songId,
      startedAt: new Date(),
      position
    };

    hall.playbackState = {
      isPlaying: true,
      position,
      timestamp: new Date()
    };

    // Reset position to 0 when starting a new song
    hall.currentSong.position = 0;

    await hall.save();

    // Get user details for system message
    const user = await User.findOne({ clerkId: userId });
    const userName = user?.fullName || 'Admin';

    const systemMessage = new HallMessage({
      hallId,
      senderId: userId,
      senderName: userName,
      content: `🎵 Now playing: "${song.title}" by ${song.artist}`,
      messageType: "system"
    });
    await systemMessage.save();

    // Broadcast to all hall members
    const syncData = {
      action: "play",
      hallId,
      songId,
      song: {
        _id: song._id,
        title: song.title,
        artist: song.artist,
        imageUrl: song.imageUrl,
        audioUrl: song.audioUrl,
        duration: song.duration
      },
      position,
      timestamp: Date.now(),
      playbackState: {
        isPlaying: true,
        position,
        timestamp: Date.now()
      }
    };

    req.io.to(`hall_${hallId}`).emit("hall:playback-sync", syncData);
    req.io.to(`hall_${hallId}`).emit("hall:queue-update", {
      queueLength: hall.queue.length
    });

    res.json({ message: "Song started playing", song, syncData });
  } catch (error) {
    console.error("Error playing song:", error);
    res.status(500).json({ message: "Error playing song" });
  }
};

// Toggle playback
export const toggleHallPlayback = async (req, res) => {
  try {
    const { hallId } = req.params;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId).populate("currentSong.songId");
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    if (hall.adminId !== userId) {
      return res.status(403).json({ message: "Only admin can control playback" });
    }

    if (!hall.currentSong || !hall.currentSong.songId) {
      return res.status(400).json({ message: "No song currently playing" });
    }

    const wasPlaying = hall.playbackState?.isPlaying || false;
    const isPlaying = !wasPlaying;

    // Calculate current position if was playing
    let currentPosition = hall.playbackState?.position || 0;
    if (wasPlaying && hall.playbackState?.timestamp) {
      const elapsed = (Date.now() - new Date(hall.playbackState.timestamp).getTime()) / 1000;
      currentPosition = Math.max(0, currentPosition + elapsed);
    }

    // Ensure position doesn't exceed song duration
    const maxPosition = hall.currentSong.songId.duration || 300;
    currentPosition = Math.min(currentPosition, maxPosition);

    hall.playbackState = {
      isPlaying,
      position: currentPosition,
      timestamp: new Date()
    };

    await hall.save();

    const syncData = {
      action: isPlaying ? "resume" : "pause",
      hallId,
      songId: hall.currentSong.songId._id,
      song: {
        _id: hall.currentSong.songId._id,
        title: hall.currentSong.songId.title,
        artist: hall.currentSong.songId.artist,
        imageUrl: hall.currentSong.songId.imageUrl,
        audioUrl: hall.currentSong.songId.audioUrl,
        duration: hall.currentSong.songId.duration
      },
      position: currentPosition,
      timestamp: Date.now(),
      playbackState: {
        isPlaying,
        position: currentPosition,
        timestamp: Date.now()
      }
    };

    // Broadcast to all hall members
    req.io.to(`hall_${hallId}`).emit("hall:playback-sync", syncData);

    res.json({
      message: `Playback ${isPlaying ? 'resumed' : 'paused'}`,
      syncData
    });
  } catch (error) {
    console.error("Error toggling playback:", error);
    res.status(500).json({ message: "Error toggling playback" });
  }
};

// Seek to position
export const seekHallPlayback = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { position } = req.body;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId).populate("currentSong.songId");
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    if (hall.adminId !== userId) {
      return res.status(403).json({ message: "Only admin can control playback" });
    }

    if (!hall.currentSong || !hall.currentSong.songId) {
      return res.status(400).json({ message: "No song currently playing" });
    }

    // Validate position
    const maxPosition = hall.currentSong.songId.duration || 300; // Default 5 minutes if no duration
    const validPosition = Math.max(0, Math.min(position, maxPosition));

    hall.playbackState.position = validPosition;
    hall.playbackState.timestamp = new Date();

    await hall.save();

    const syncData = {
      action: "seek",
      hallId,
      position: validPosition,
      timestamp: Date.now(),
      playbackState: {
        isPlaying: hall.playbackState.isPlaying,
        position: validPosition,
        timestamp: Date.now()
      }
    };

    req.io.to(`hall_${hallId}`).emit("hall:playback-sync", syncData);

    res.json({
      message: "Seeked successfully",
      position: validPosition,
      syncData
    });
  } catch (error) {
    console.error("Error seeking:", error);
    res.status(500).json({ message: "Error seeking" });
  }
};

// Add to queue
export const addToHallQueue = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { songId } = req.body;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    if (hall.adminId !== userId) {
      return res.status(403).json({ message: "Only admin can manage queue" });
    }

    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    // Check if song is already in queue
    const isAlreadyInQueue = hall.queue.some(queueItem =>
      queueItem.songId.toString() === songId
    );

    if (isAlreadyInQueue) {
      return res.status(400).json({ message: "Song is already in queue" });
    }

    hall.queue.push({
      songId,
      addedBy: userId,
      addedAt: new Date()
    });

    await hall.save();

    // Get user details
    const user = await User.findOne({ clerkId: userId });
    const userName = user?.fullName || 'Admin';

    // Create system message
    const systemMessage = new HallMessage({
      hallId,
      senderId: userId,
      senderName: userName,
      content: `🎶 Added "${song.title}" by ${song.artist} to queue`,
      messageType: "system"
    });
    await systemMessage.save();

    const queueUpdateData = {
      action: "add",
      song: {
        _id: song._id,
        title: song.title,
        artist: song.artist,
        imageUrl: song.imageUrl,
        duration: song.duration
      },
      queueLength: hall.queue.length,
      addedBy: userName
    };

    req.io.to(`hall_${hallId}`).emit("hall:queue-update", queueUpdateData);

    res.json({ message: "Song added to queue", queueUpdateData });
  } catch (error) {
    console.error("Error adding to queue:", error);
    res.status(500).json({ message: "Error adding to queue" });
  }
};

// Remove from queue
export const removeFromHallQueue = async (req, res) => {
  try {
    const { hallId, queueIndex } = req.params;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    if (hall.adminId !== userId) {
      return res.status(403).json({ message: "Only admin can manage queue" });
    }

    if (queueIndex >= hall.queue.length) {
      return res.status(400).json({ message: "Invalid queue index" });
    }

    hall.queue.splice(queueIndex, 1);
    await hall.save();

    req.io.to(`hall_${hallId}`).emit("hall:queue-update", {
      action: "remove",
      queueIndex: parseInt(queueIndex),
      queueLength: hall.queue.length
    });

    res.json({ message: "Song removed from queue" });
  } catch (error) {
    console.error("Error removing from queue:", error);
    res.status(500).json({ message: "Error removing from queue" });
  }
};

// Skip to next
export const skipToNext = async (req, res) => {
  try {
    const { hallId } = req.params;
    const userId = req.auth.userId;

    const hall = await Hall.findById(hallId).populate("queue.songId");
    if (!hall) {
      return res.status(404).json({ message: "Hall not found" });
    }

    if (hall.adminId !== userId) {
      return res.status(403).json({ message: "Only admin can control playback" });
    }

    if (hall.queue.length === 0) {
      // If queue is empty but we have a current song, REPLAY it (Loop Single)
      if (hall.currentSong && hall.currentSong.songId) {
        console.log("Queue empty, replaying current song (Loop Single)");

        // Reset position to 0
        hall.currentSong.startedAt = new Date();
        hall.currentSong.position = 0;

        hall.playbackState = {
          isPlaying: true,
          position: 0,
          timestamp: new Date()
        };

        await hall.save();

        // Re-fetch song details to be safe
        const currentSongDetails = await Song.findById(hall.currentSong.songId);

        const syncData = {
          action: "play", // Treat as a new play event
          hallId,
          songId: hall.currentSong.songId,
          song: {
            _id: currentSongDetails._id,
            title: currentSongDetails.title,
            artist: currentSongDetails.artist,
            imageUrl: currentSongDetails.imageUrl,
            audioUrl: currentSongDetails.audioUrl,
            duration: currentSongDetails.duration
          },
          position: 0,
          timestamp: Date.now(),
          playbackState: {
            isPlaying: true,
            position: 0,
            timestamp: Date.now()
          }
        };

        req.io.to(`hall_${hallId}`).emit("hall:playback-sync", syncData);

        return res.json({ message: "Replaying current song", song: currentSongDetails, syncData });
      }

      // Stop playback if queue is empty AND no current song
      hall.currentSong = null;
      hall.playbackState = {
        isPlaying: false,
        position: 0,
        timestamp: new Date()
      };
      await hall.save();

      req.io.to(`hall_${hallId}`).emit("hall:playback-sync", {
        action: "stop",
        song: null,
        position: 0,
        timestamp: Date.now(),
        playbackState: {
          isPlaying: false,
          position: 0,
          timestamp: Date.now()
        }
      });

      return res.status(400).json({ message: "Queue is empty - playback stopped" });
    }

    const nextSong = hall.queue[0];

    hall.currentSong = {
      songId: nextSong.songId._id,
      startedAt: new Date(),
      position: 0
    };

    hall.playbackState = {
      isPlaying: true,
      position: 0,
      timestamp: new Date()
    };

    // Remove the played song from queue
    hall.queue.shift();

    await hall.save();

    // Get user details
    const user = await User.findOne({ clerkId: userId });
    const userName = user?.fullName || 'Admin';

    const systemMessage = new HallMessage({
      hallId,
      senderId: userId,
      senderName: userName,
      content: `⏭️ Skipped to: "${nextSong.songId.title}" by ${nextSong.songId.artist}`,
      messageType: "system"
    });
    await systemMessage.save();

    const syncData = {
      action: "next",
      hallId,
      song: {
        _id: nextSong.songId._id,
        title: nextSong.songId.title,
        artist: nextSong.songId.artist,
        imageUrl: nextSong.songId.imageUrl,
        audioUrl: nextSong.songId.audioUrl,
        duration: nextSong.songId.duration
      },
      position: 0,
      timestamp: Date.now(),
      playbackState: {
        isPlaying: true,
        position: 0,
        timestamp: Date.now()
      },
      queueLength: hall.queue.length
    };

    req.io.to(`hall_${hallId}`).emit("hall:playback-sync", syncData);
    req.io.to(`hall_${hallId}`).emit("hall:queue-update", {
      action: "next",
      queueLength: hall.queue.length
    });

    res.json({ message: "Skipped to next song", song: nextSong.songId, syncData });
  } catch (error) {
    console.error("Error skipping to next:", error);
    res.status(500).json({ message: "Error skipping to next" });
  }
};