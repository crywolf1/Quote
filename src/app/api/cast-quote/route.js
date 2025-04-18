// pages/api/farcaster/cast.js
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { dbConnect } from "../../../lib/db"; // Adjust path as needed

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fid, text, quoteId } = req.body;

  if (!fid || !text) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Initialize Neynar client
    const neynarClient = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

    // Optional: Track the cast in your MongoDB if needed
    if (quoteId) {
      const { db } = await dbConnect();
      await db.collection("quotes").updateOne(
        { _id: quoteId },
        {
          $inc: { castCount: 1 },
          $push: {
            casts: {
              fid: fid,
              timestamp: new Date(),
            },
          },
        }
      );
    }

    // Get the signer for this FID
    const signerResponse = await neynarClient.lookupUserByfid(fid);
    const signerUuid = signerResponse.data.user.signerUuid;

    if (!signerUuid) {
      return res.status(404).json({ error: "Signer not found for this user" });
    }

    // Publish the cast using Neynar
    const castResponse = await neynarClient.publishCast({
      signer_uuid: signerUuid,
      text: text,
    });

    return res.status(200).json({
      success: true,
      hash: castResponse.data.hash,
    });
  } catch (error) {
    console.error("Error publishing cast:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to publish cast" });
  }
}
