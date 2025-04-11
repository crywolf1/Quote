// src/app/api/neynar/route.js
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export async function GET(request) {
  console.log("API route hit:", request.url);

  // Check for the Neynar API key in environment variables
  if (!process.env.NEYNAR_API_KEY) {
    console.error("NEYNAR_API_KEY is not defined");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

  try {
    // Extract FID from query parameters
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      throw new Error("No FID provided");
    }

    // Fetch user data from Neynar API
    const userResponse = await client.fetchBulkUsers([parseInt(fid)]);
    const user = userResponse.users?.[0];

    if (!user) {
      throw new Error("User not found");
    }

    // Prepare the user data with consistent field names
    const userData = {
      username: user.display_name || user.username || `fid:${fid}`,
      pfpUrl: user.pfp_url || "/default-avatar.jpg",
      fid: fid,
    };

    console.log("User data:", userData);

    // Return the user data as JSON
    return new Response(JSON.stringify(userData), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("API Error:", error.message);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch user data",
        message: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
