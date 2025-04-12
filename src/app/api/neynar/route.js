import { NextResponse } from "next/server";
import { NeynarV2 } from "@neynar/nodejs-sdk";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");
    const address = searchParams.get("address");

    console.log("🔍 Request params:", { fid, address });

    const neynarClient = new NeynarV2(process.env.NEYNAR_API_KEY);

    if (address) {
      console.log("📱 Fetching user by address:", address);
      const response = await neynarClient.fetchUserByVerification(address);
      console.log("✅ Neynar address lookup response:", response);

      if (!response?.result) {
        return NextResponse.json({ error: "No user found for address" }, { status: 404 });
      }

      return formatUserResponse(response.result);
    }

    if (fid) {
      console.log("🎯 Fetching user by FID:", fid);
      const response = await neynarClient.fetchUser(fid);
      console.log("✅ Neynar FID lookup response:", response);

      if (!response?.result) {
        return NextResponse.json({ error: "No user found for FID" }, { status: 404 });
      }

      return formatUserResponse(response.result);
    }

    throw new Error("Either FID or address is required");
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatUserResponse(user) {
  return NextResponse.json({
    users: [{
      username: user.username,
      display_name: user.displayName,
      pfp_url: user.pfp?.url,
      fid: user.fid,
      profile: {
        bio: user.profile?.bio,
      },
      follower_count: user.followerCount,
      following_count: user.followingCount,
      verified_addresses: user.verifications?.map(v => v.address) || []
    }]
  });
}