// models/Quote.js
import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
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
    dateKey: { type: String, required: true }, // Add the dateKey field to avoid duplicate entries
  },
  { timestamps: true }
);

export default mongoose.models.Quote || mongoose.model("Quote", quoteSchema);
