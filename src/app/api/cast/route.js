// pages/api/cast.js
import { NeynarAPIClient, createConfiguration } from "@neynar/nodejs-sdk";

const config = createConfiguration({
  apiKey: process.env.NEYNAR_API_KEY, // This should be a valid string like "NEYNAR_API_DOCS"
});
const client = new NeynarAPIClient(config);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, signerUuid, fid } = req.body;

  if (!text || !signerUuid || !fid) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await client.cast.publishCast(signerUuid, { text });
    return res.status(200).json({ cast: result });
  } catch (error) {
    console.error("Cast error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to cast quote." });
  }
}
