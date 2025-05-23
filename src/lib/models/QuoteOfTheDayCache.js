import mongoose from "mongoose";

const cacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // user+12h key
  quoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quote",
    required: true,
  },
  createdAt: { type: Date, default: Date.now, expires: 43200 }, // auto-remove after 12h
});

export default mongoose.models.QuoteOfTheDayCache ||
  mongoose.model("QuoteOfTheDayCache", cacheSchema);
