// app/api/cast/route.js
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const neynarClient = new NeynarAPIClient(
  new Configuration({
    apiKey: process.env.NEYNAR_API_KEY,
  })
);

export async function POST(req) {
  try {
    const { text, signerUuid, fid } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text content is required" }),
        {
          status: 400,
        }
      );
    }

    if (!signerUuid) {
      return new Response(
        JSON.stringify({ error: "Signer UUID is required" }),
        {
          status: 400,
        }
      );
    }

    if (!fid) {
      return new Response(JSON.stringify({ error: "FID is required" }), {
        status: 400,
      });
    }

    // First check if the signer is valid
    try {
      const signerInfo = await neynarClient.signer.getInfo(signerUuid);

      if (signerInfo.status !== "approved") {
        return new Response(
          JSON.stringify({
            error:
              "Signer is not authorized. Current status: " + signerInfo.status,
          }),
          { status: 403 }
        );
      }

      if (signerInfo.fid !== fid) {
        return new Response(
          JSON.stringify({
            error: "Signer FID does not match the provided FID",
          }),
          { status: 403 }
        );
      }
    } catch (signerError) {
      console.error("Error checking signer:", signerError);
      return new Response(
        JSON.stringify({
          error: "Failed to validate signer",
          details: signerError.message,
        }),
        { status: 500 }
      );
    }

    // Now attempt to publish the cast
    try {
      const castResult = await neynarClient.publishCast(signerUuid, { text });

      return new Response(
        JSON.stringify({
          success: true,
          cast: castResult,
        }),
        { status: 200 }
      );
    } catch (castError) {
      console.error("Error publishing cast:", castError);
      return new Response(
        JSON.stringify({
          error: "Failed to publish cast",
          details: castError.message,
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Cast API error:", error);
    return new Response(
      JSON.stringify({
        error: "Server error",
        details: error.message,
      }),
      { status: 500 }
    );
  }
}
