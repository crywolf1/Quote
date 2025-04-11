import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export async function GET(request) {
  // Debug: Log request details
  console.log("API Request received:", {
    url: request.url,
    headers: Object.fromEntries(request.headers),
  });

  if (!process.env.NEYNAR_API_KEY) {
    console.error("NEYNAR_API_KEY is not defined");
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    console.log("Received FID:", fid);

    if (!fid) {
      return Response.json({ error: "No FID provided" }, { status: 400 });
    }

    // Fetch user data from Neynar
    const response = await client.lookupUser(fid);
    console.log("Raw Neynar response:", JSON.stringify(response, null, 2));

    // Check if we have the user data in the expected structure
    if (!response || !response.result || !response.result.user) {
      console.error("Invalid response structure from Neynar");
      return Response.json({ error: "Invalid user data" }, { status: 500 });
    }

    const user = response.result.user;
    console.log("Processed user data:", user);

    const userData = {
      username: user.display_name || user.username,
      pfpUrl: user.pfp_url,
      fid: user.fid,
      profile: {
        bio: user.profile?.bio,
        followers: user.follower_count,
        following: user.following_count,
      },
    };

    console.log("Sending response:", userData);

    return Response.json(userData);
  } catch (error) {
    console.error("Neynar API error:", {
      message: error.message,
      stack: error.stack,
    });
    return Response.json(
      { error: "Failed to fetch user data", details: error.message },
      { status: 500 }
    );
  }
}
