import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    // Extract data from the frame message
    const { untrustedData } = body;

    // For development testing purposes, we can use untrustedData
    // In production, you should validate the request using trustedData
    const fid = untrustedData?.fid;
    const username = untrustedData?.username || "Guest";
    const displayName = untrustedData?.displayName || username;
    const pfpUrl = untrustedData?.pfp?.url || "/default-avatar.jpg";

    // Create full app URL with user context
    const appUrl = new URL("https://quote-production-679a.up.railway.app");
    if (fid) appUrl.searchParams.set("fid", fid);
    if (username) appUrl.searchParams.set("username", username);
    if (displayName) appUrl.searchParams.set("displayName", displayName);
    if (pfpUrl) appUrl.searchParams.set("pfpUrl", pfpUrl);

    // Frame response with a redirect to the main app
    return NextResponse.json({
      action: "redirect",
      target: appUrl.toString(),
      // Old style frames response for backward compatibility
      // Newer clients will use the action/target properties
      frames: {
        version: "vNext",
        image: "https://quote-production-679a.up.railway.app/assets/phone.png",
        redirect: appUrl.toString(),
      },
    });
  } catch (error) {
    console.error("Frame API Error:", error);

    // Return a generic error response
    return NextResponse.json({
      action: "post",
      frames: {
        version: "vNext",
        image: "https://quote-production-679a.up.railway.app/assets/fb.png",
        buttons: [{ label: "Try Again", action: "post" }],
      },
    });
  }
}
