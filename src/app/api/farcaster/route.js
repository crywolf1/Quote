// pages/api/farcaster/cast.js
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fid, text } = req.body;

  if (!fid || !text) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Initialize Neynar client
    const neynarClient = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

    // Get the signer UUID for this FID
    const userResponse = await neynarClient.lookupUserByFid(fid);

    if (!userResponse?.data?.user?.verified_addresses?.length) {
      return res
        .status(404)
        .json({ error: "No verified addresses found for this FID" });
    }

    // Create a signer for this user if one doesn't exist
    const signerResponse = await neynarClient.createSigner({
      fid: fid,
      app_fid: parseInt(process.env.NEYNAR_APP_FID || "1"), // Your app's FID
    });

    const signerUuid = signerResponse.data.signer.signer_uuid;

    // Publish the cast
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
