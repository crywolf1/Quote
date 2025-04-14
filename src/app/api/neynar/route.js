// /api/farcaster-profile.js
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const client = new NeynarAPIClient(config);

export default async function handler(req, res) {
  const { fid } = req.query;

  if (!fid) {
    return res.status(400).json({ error: "FID is required" });
  }

  try {
    const response = await client.lookupUserByFID({ fid: parseInt(fid) });

    if (!response || !response.result || !response.result.user) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = response.result.user;

    res.status(200).json({
      username: user.username,
      pfpUrl: user.pfp_url,
    });
  } catch (error) {
    console.error("Error fetching user by FID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}