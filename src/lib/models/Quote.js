// models/Quote.js
import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    text: { type: String, required: true },
    zoraTokenAddress: { type: String },
    zoraTokenTxHash: { type: String }, // Changed from zoraTxHash for consistency
    tokenMetadataUrl: { type: String }, // Store the IPFS metadata URL
    dexscreenerUrl: { type: String },
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
    image: String, // Store the image data URL
    style: { type: String, enum: ["dark", "pink", "green"], default: "dark" }, // Add this line

    // Add these fields for token creation status tracking
    isPending: { type: Boolean, default: false },

    // PayoutRecipient tracking
    payoutRecipient: { type: String }, // Current payout recipient address
    payoutRecipientUpdated: { type: Boolean, default: false }, // Whether it has been updated from initial
    payoutRecipientUpdateHash: { type: String }, // Transaction hash of the update

    // Split contract information
    splitContractAddress: { type: String }, // Address of the split contract
    splitContractTxHash: { type: String }, // Transaction hash of split creation
    platformPercentage: { type: Number }, // Platform percentage in split
    creatorPercentage: { type: Number }, // Creator percentage in split

    // Additional tracking fields
    payoutRecipientUpdateError: { type: String }, // Store any errors during update
    payoutRecipientUpdateAttempted: { type: Boolean, default: false }, // Whether update was attempted
  },
  { timestamps: true }
);

export default mongoose.models.Quote || mongoose.model("Quote", quoteSchema);
