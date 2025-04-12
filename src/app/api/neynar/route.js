import { NextResponse } from "next/server";
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");
    const address = searchParams.get("address");

    console.log("🔍 Request params:", { fid, address });

    if (!process.env.NEYNAR_API_KEY) {
      throw new Error("NEYNAR_API_KEY not configured");
    }

    const config = new Configuration({
      apiKey: process.env.NEYNAR_API_KEY,
      baseOptions: {
        headers: {
          "x-neynar-experimental": true,
        },
      },
    });

    const client = new NeynarAPIClient(config);

    if (address) {
      console.log("📱 Fetching user by address:", address);
      // Updated method name for v2
      const response = await client.getUserByVerification(address);
      console.log("✅ Neynar address lookup response:", response);

      if (!response?.result?.user) {
        return NextResponse.json(
          { error: "No user found for address" },
          { status: 404 }
        );
      }

      return formatUserResponse(response.result.user);
    }

    if (fid) {
      console.log("🎯 Fetching user by FID:", fid);
      const response = await client.lookupUser(fid);
      console.log("✅ Neynar FID lookup response:", response);

      if (!response?.result?.user) {
        return NextResponse.json(
          { error: "No user found for FID" },
          { status: 404 }
        );
      }

      return formatUserResponse(response.result.user);
    }

    throw new Error("Either FID or address is required");
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatUserResponse(user) {
  return NextResponse.json({
    users: [
      {
        username: user.username,
        display_name: user.display_name || user.username,
        pfp_url: user.pfp?.url || user.pfp_url,
        fid: user.fid,
        profile: {
          bio: user.profile?.bio,
        },
        follower_count: user.follower_count || user.followerCount,
        following_count: user.following_count || user.followingCount,
        verified_addresses:
          user.verified_addresses || user.verifications?.map((v) => v.address),
      },
    ],
  });
}
