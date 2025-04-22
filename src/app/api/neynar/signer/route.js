// app/api/neynar/signer/route.js
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const neynarClient = new NeynarAPIClient(
  new Configuration({
    apiKey: process.env.NEYNAR_API_KEY,
  })
);

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const signerUuid = url.searchParams.get("signerUuid");

    if (!signerUuid) {
      return new Response(
        JSON.stringify({ error: "signerUuid parameter is required" }),
        { status: 400 }
      );
    }

    // Get signer information
    const signerInfo = await neynarClient.signer.getInfo(signerUuid);

    if (!signerInfo || !signerInfo.fid) {
      return new Response(
        JSON.stringify({ error: "Invalid signer UUID or signer not found" }),
        { status: 404 }
      );
    }

    // Get user information by FID
    const userResponse = await neynarClient.user.getUserByFid(signerInfo.fid);

    return new Response(
      JSON.stringify({
        signer: signerInfo,
        user: userResponse,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Signer API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch signer information",
        details: error.message,
      }),
      { status: 500 }
    );
  }
}
