import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export async function GET(request) {
  console.log("Environment check:", {
    nodeEnv: process.env.NODE_ENV,
    hasApiKey: !!process.env.NEYNAR_API_KEY,
    apiKeyPrefix: process.env.NEYNAR_API_KEY?.substring(0, 4),
  });

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

    console.log(`Processing FID: ${fid}`, new Date().toISOString());

    if (!fid) {
      throw new Error("No FID provided");
    }

    const userResponse = await client.fetchBulkUsers([parseInt(fid)]);
    console.log("Neynar Response:", JSON.stringify(userResponse, null, 2));

    const user = userResponse.users?.[0];
    if (!user) {
      throw new Error("User not found");
    }

    const userData = {
      username: user.displayName || user.username || `fid:${fid}`,
      pfpUrl: user.pfp?.url || "/default-avatar.jpg",
      fid: fid,
    };

    console.log("Final user data:", JSON.stringify(userData, null, 2));

    return new Response(JSON.stringify(userData), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
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
