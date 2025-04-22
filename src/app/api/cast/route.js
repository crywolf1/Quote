// pages/api/cast.js
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, signerUuid, fid } = req.body;

  if (!text || !signerUuid || !fid) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const cast = await client.publishCast(signerUuid, {
      text,
    });

    return res.status(200).json({ cast });
  } catch (error) {
    console.error("Cast error:", error);
    return res.status(500).json({ error: "Failed to cast quote." });
  }
}
