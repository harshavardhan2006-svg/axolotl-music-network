import mongoose from "mongoose";

const hallSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  description: {
    type: String,
    maxLength: 500,
    default: ""
  },
  coverImage: {
    type: String,
    default: "/albums/album1.jpg"
  },
  type: {
    type: String,
    enum: ["public", "private"],
    default: "public"
  },
  adminId: {
    type: String,
    required: true
  },
  members: [{
    userId: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentSong: {
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song"
    },
    startedAt: {
      type: Date
    },
    position: {
      type: Number,
      default: 0
    }
  },
  playbackState: {
    isPlaying: {
      type: Boolean,
      default: false
    },
    position: {
      type: Number,
      default: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  queue: [{
    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song",
      required: true
    },
    addedBy: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Virtual for member count
hallSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Ensure virtuals are included in JSON
hallSchema.set('toJSON', { virtuals: true });

export const Hall = mongoose.model("Hall", hallSchema);