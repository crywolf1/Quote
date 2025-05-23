import mongoose from "mongoose";

const NotificationHistorySchema = new mongoose.Schema({
  quoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote',
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  title: String,
  body: String,
  targetUrl: String,
  targetFidCount: Number,
  successCount: Number,
  notificationId: String,
  deliveryDetails: Array
});

export default mongoose.models.NotificationHistory ||
  mongoose.model("NotificationHistory", NotificationHistorySchema);