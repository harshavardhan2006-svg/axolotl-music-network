import mongoose from "mongoose";

const hallMessageSchema = new mongoose.Schema({
  hallId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hall",
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: false // Optional for backward compatibility
  },
  content: {
    type: String,
    required: true,
    maxLength: 1000
  },
  replyTo: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HallMessage"
    },
    content: String,
    senderName: String
  },
  messageType: {
    type: String,
    enum: ["text", "system"],
    default: "text"
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
hallMessageSchema.index({ hallId: 1, createdAt: -1 });

export const HallMessage = mongoose.model("HallMessage", hallMessageSchema);