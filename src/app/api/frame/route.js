import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Parse the incoming frame action
    const body = await request.json();

    // Extract Frame Message data
    const { trustedData } = body;
    const { messageBytes } = trustedData;

    // You'll need to validate the message using Farcaster's Frame verification
    // This is a simplified version - in production you'd use the Farcaster SDK

    let userData = {};

    // In a real implementation, you would:
    // 1. Decode and verify the messageBytes
    // 2. Extract user data from the validated message
    // For now, we'll simulate this process

    if (body.untrustedData) {
      const { fid, username, displayName, pfp } = body.untrustedData;
      userData = {
        fid,
        username,
        displayName,
        pfpUrl: pfp?.url || "/default-avatar.jpg",
      };
    }

    // Generate a redirect URL with user data
    const redirectUrl = new URL("https://quote-production-679a.up.railway.app");
    if (userData.fid) redirectUrl.searchParams.set("fid", userData.fid);
    if (userData.username)
      redirectUrl.searchParams.set("username", userData.username);
    if (userData.displayName)
      redirectUrl.searchParams.set("displayName", userData.displayName);
    if (userData.pfpUrl)
      redirectUrl.searchParams.set("pfpUrl", userData.pfpUrl);

    // Return the frame response
    return NextResponse.json({
      frames: {
        version: "vNext",
        image:
          "https://quote-production-679a.up.railway.app/assets/quote-card.png",
        redirect: redirectUrl.toString(),
      },
    });
  } catch (error) {
    console.error("Frame error:", error);
    return NextResponse.json(
      { error: "Failed to process frame action" },
      { status: 500 }
    );
  }
}
