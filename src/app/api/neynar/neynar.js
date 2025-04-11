import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export async function GET(request) {
  // First, log everything about the environment and request
  console.log("Environment check:", {
    nodeEnv: process.env.NODE_ENV,
    hasApiKey: !!process.env.NEYNAR_API_KEY,
    apiKeyPrefix: process.env.NEYNAR_API_KEY?.substring(0, 4),
  });

  // Force console logs to appear
  console.log(
    "Request details:",
    {
      method: request.method,
      url: request.url,
    },
    new Date().toISOString()
  );

  if (!process.env.NEYNAR_API_KEY) {
    throw new Error("NEYNAR_API_KEY is not defined");
  }

  const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    // Debug FID
    console.log(`Processing FID: ${fid}`, new Date().toISOString());

    if (!fid) {
      throw new Error("No FID provided");
    }

    // Try direct user lookup with error handling
    try {
      const userResponse = await client.lookupUser(fid);
      console.log("Neynar Response:", JSON.stringify(userResponse, null, 2));

      // Extract user data from response
      const userData = {
        username:
          userResponse?.result?.user?.display_name ||
          userResponse?.result?.user?.username ||
          `fid:${fid}`,
        pfpUrl: userResponse?.result?.user?.pfp_url || "/default-avatar.jpg",
        fid: fid,
      };

      // Force log the final data
      console.log("Final user data:", JSON.stringify(userData, null, 2));

      return new Response(JSON.stringify(userData), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (lookupError) {
      console.error("User lookup failed:", {
        error: lookupError.message,
        stack: lookupError.stack,
      });
      throw lookupError;
    }
  } catch (error) {
    // Log error with timestamp
    console.error("API Error:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "API Error",
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
