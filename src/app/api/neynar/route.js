import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");
    const address = searchParams.get("address");

    console.log("🔍 Request params:", { fid, address });

    if (!process.env.NEYNAR_API_KEY) {
      throw new Error("NEYNAR_API_KEY not configured");
    }

    // Initialize client with API key directly
    const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

    if (address) {
      console.log("📱 Fetching user by address:", address);
      try {
        // First get FID by ethereum address
        const verificationResponse = await client.lookupUserByVerification(
          address
        );
        console.log("✅ Verification response:", verificationResponse);

        if (!verificationResponse?.result?.user) {
          return NextResponse.json(
            { error: "No user found for address" },
            { status: 404 }
          );
        }

        // Get full user data using FID
        const userResponse = await client.lookupUser(
          verificationResponse.result.user.fid
        );
        console.log("✅ User response:", userResponse);

        if (!userResponse?.result?.user) {
          return NextResponse.json(
            { error: "User data not found" },
            { status: 404 }
          );
        }

        return formatUserResponse(userResponse.result.user);
      } catch (error) {
        console.error("❌ Neynar API Error:", error);
        return NextResponse.json(
          { error: "Failed to fetch user data" },
          { status: 500 }
        );
      }
    }

    if (fid) {
      try {
        const userResponse = await client.lookupUser(fid);
        if (!userResponse?.result?.user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        return formatUserResponse(userResponse.result.user);
      } catch (error) {
        console.error("❌ Neynar API Error:", error);
        return NextResponse.json(
          { error: "Failed to fetch user data" },
          { status: 500 }
        );
      }
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
        display_name: user.displayName || user.username,
        pfp_url: user.pfp?.url || user.pfp_url,
        fid: user.fid,
        profile: {
          bio: user.profile?.bio,
        },
        follower_count: user.followerCount || user.follower_count,
        following_count: user.followingCount || user.following_count,
        verified_addresses:
          user.verifications?.map((v) => v.address) ||
          user.verified_addresses ||
          [],
      },
    ],
  });
}
