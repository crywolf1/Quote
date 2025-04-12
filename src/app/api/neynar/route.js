import { NextResponse } from "next/server";
import { NeynarV2 } from "@neynar/nodejs-sdk";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");
    const address = searchParams.get("address");

    console.log("🔍 Request params:", { fid, address });

    if (!process.env.NEYNAR_API_KEY) {
      throw new Error("NEYNAR_API_KEY not configured");
    }

    // Initialize Neynar client
    const neynarClient = new NeynarV2(process.env.NEYNAR_API_KEY);

    // Fetch user by Ethereum address
    if (address) {
      try {
        const userResponse = await neynarClient.lookupUserByVerification(
          address
        );
        console.log("✅ User lookup response:", userResponse);

        if (!userResponse?.user) {
          return NextResponse.json(
            { error: "No Farcaster account found for this address" },
            { status: 404 }
          );
        }

        return formatUserResponse(userResponse.user);
      } catch (error) {
        console.error("❌ Neynar API Error (address lookup):", error);
        return NextResponse.json(
          { error: "Failed to fetch user data by Ethereum address" },
          { status: 500 }
        );
      }
    }

    // Fetch user by FID
    if (fid) {
      try {
        const userResponse = await neynarClient.lookupUser(fid);
        console.log("✅ User lookup response by FID:", userResponse);

        if (!userResponse?.user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        return formatUserResponse(userResponse.user);
      } catch (error) {
        console.error("❌ Neynar API Error (FID lookup):", error);
        return NextResponse.json(
          { error: "Failed to fetch user data by FID" },
          { status: 500 }
        );
      }
    }

    // If neither address nor FID is provided
    throw new Error("Either 'fid' or 'address' query parameter is required");
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
        display_name: user.displayName,
        pfp_url: user.pfp?.url,
        fid: user.fid,
        profile: {
          bio: user.profile?.bio,
        },
        follower_count: user.followerCount,
        following_count: user.followingCount,
        verified_addresses: user.verifications?.map((v) => v.address) || [],
      },
    ],
  });
}
