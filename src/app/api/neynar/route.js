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

    // Correct v2 SDK configuration
    const config = new Configuration({
      apiKey: process.env.NEYNAR_API_KEY,
      baseOptions: {
        headers: {
          "x-neynar-api-key": process.env.NEYNAR_API_KEY,
          "x-neynar-experimental": true,
        },
      },
    });

    const client = new NeynarAPIClient(config);

    if (address) {
      try {
        const verifications = await client.verificationsByAddress(address);
        console.log("✅ Verifications:", verifications);

        if (!verifications?.result?.verifications?.length) {
          return NextResponse.json(
            { error: "No Farcaster account found for this address" },
            { status: 404 }
          );
        }

        const fid = verifications.result.verifications[0].fid;
        const userResponse = await client.fetchUser(fid);

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

    throw new Error("Address parameter is required");
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
