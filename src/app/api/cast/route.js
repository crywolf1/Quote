import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Initialize the Neynar client
const neynarApiKey = process.env.NEYNAR_API_KEY;
if (!neynarApiKey) {
  console.error("Missing NEYNAR_API_KEY environment variable");
}

const client = new NeynarAPIClient(
  new Configuration({
    apiKey: neynarApiKey,
  })
);

export async function POST(req) {
  console.log("Cast API route called");

  try {
    const body = await req.json();
    console.log("Request body:", body);

    const { text, signerUuid } = body;

    if (!text) {
      console.log("Missing text");
      return new Response(JSON.stringify({ error: "Missing quote text" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!signerUuid) {
      console.log("Missing signerUuid");
      return new Response(
        JSON.stringify({
          error: "Missing signer UUID. Please sign in with Farcaster.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Publishing cast with:", { signerUuid, text });

    // Call the Neynar API to publish the cast
    const result = await client.cast.publishCast(signerUuid, { text });
    console.log("Cast published successfully:", result);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cast published successfully",
        hash: result.hash,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Cast error:", error);

    let errorMessage = "Failed to cast";
    let statusCode = 500;

    // Try to extract more detailed error information
    if (error.response) {
      try {
        const errorData = error.response.data;
        errorMessage = errorData.message || "API error";
        statusCode = error.response.status;
        console.error("API error details:", errorData);
      } catch (e) {
        console.error("Error parsing API error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error.message || error.toString(),
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
