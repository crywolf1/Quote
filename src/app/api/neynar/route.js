import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    console.log("🔥 Incoming request to /api/neynar with fid:", fid);

    if (!fid) {
      console.warn("❌ Missing fid in query params");
      return NextResponse.json({ error: "Missing fid" }, { status: 400 });
    }

    // Initialize Neynar client
    const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);
    console.log("✅ Neynar client initialized");

    // Use the SDK to fetch user data
    const response = await client.lookupUser(fid);
    console.log("✅ Neynar API response:", response);

    if (!response?.result?.user) {
      console.warn("❌ No user found for fid:", fid);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = response.result.user;

    // Return structured user data matching Neynar v2 response
    return NextResponse.json({
      users: [
        {
          username: user.username,
          display_name: user.display_name,
          pfp_url: user.pfp_url,
          fid: user.fid,
          profile: {
            bio: user.profile?.bio,
          },
          follower_count: user.follower_count,
          following_count: user.following_count,
          verified_addresses: user.verified_addresses,
        },
      ],
    });
  } catch (error) {
    console.error("❌ Error in /api/neynar:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
