// backend/api/farcaster-profile.js
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Set up your Neynar API Client
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY, // Make sure to set your API key in the environment variables
});
const client = new NeynarAPIClient(config);

export default async function handler(req, res) {
  const { ethAddress } = req.query; // Get Ethereum address from query param

  if (!ethAddress) {
    return res.status(400).json({ error: "Ethereum address is required" });
  }

  try {
    // Fetch the user profile based on Ethereum address
    const response = await client.fetchBulkUsersByEthOrSolAddress({
      addresses: [ethAddress],
    });

    const user = response.result?.user;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Respond with the user's Farcaster profile
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching Farcaster profile:", error);
    res.status(500).json({ error: "Error fetching Farcaster profile" });
  }
}
