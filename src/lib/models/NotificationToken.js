import mongoose from "mongoose";

const NotificationTokenSchema = new mongoose.Schema({
  fid: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  token: {
    type: String,
  },
  url: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  eventHistory: [
    {
      event: {
        type: String,
        enum: [
          "notification_permission_granted",
          "notification_permission_revoked",
          "mini_app_added",
          "mini_app_removed",
          "manual_token_update",
        ],
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

export default mongoose.models.NotificationToken ||
  mongoose.model("NotificationToken", NotificationTokenSchema);
