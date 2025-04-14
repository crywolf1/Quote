// app/api/neynar/route.js
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});

const client = new NeynarAPIClient(config);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");

  if (!fid) {
    return new Response(
      JSON.stringify({ error: "FID is required" }),
      { status: 400 }
    );
  }

  try {
    const response = await client.lookupUserByFid({ fid: parseInt(fid) });
    const user = response.result.user;

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        username: user.username,
        pfp_url: user.pfp_url || "/default-avatar.jpg",
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching user:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch user" }),
      { status: 500 }
    );
  }
}