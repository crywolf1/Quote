import mongoose from "mongoose";

// Define the schema
const NotificationTokenSchema = new mongoose.Schema(
  {
    fid: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    lastNotified: {
      type: Date,
      default: null,
    },
    eventHistory: {
      type: [
        {
          event: String,
          timestamp: Date,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Export the model
export default mongoose.models.NotificationToken ||
  mongoose.model("NotificationToken", NotificationTokenSchema);
