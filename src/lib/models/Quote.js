// models/Quote.js
import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    text: { type: String, required: true },
    zoraTokenAddress: { type: String },
    creatorAddress: { type: String, required: true },
    fid: Number,
    username: String,
    displayName: String,
    pfpUrl: String,
    verifiedAddresses: {
      eth_addresses: [String],
      sol_addresses: [String],
      primary: {
        eth_address: String,
        sol_address: String,
      },
    },
    dateKey: { type: String, required: true },

    image: String, // <-- Add this line to store the image data URL
  },
  { timestamps: true }
);

export default mongoose.models.Quote || mongoose.model("Quote", quoteSchema);
