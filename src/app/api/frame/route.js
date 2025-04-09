import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { untrustedData } = body || {};
    const { fid } = untrustedData || {};

    if (!fid) {
      console.log("No FID provided in request body:", body);
      return NextResponse.redirect(
        "https://quote-production-679a.up.railway.app/?username=Guest&pfpUrl=/default-avatar.jpg",
        302
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "";
    if (!apiKey) {
      console.error("NEXT_PUBLIC_NEYNAR_API_KEY is not set!");
      return NextResponse.redirect(
        "https://quote-production-679a.up.railway.app/?username=No-API-Key&pfpUrl=/default-avatar.jpg",
        302
      );
    }

    const neynarResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          accept: "application/json",
          api_key: apiKey,
        },
      }
    );

    if (!neynarResponse.ok) {
      console.error("Neynar API error:", await neynarResponse.text());
      return NextResponse.redirect(
        "https://quote-production-679a.up.railway.app/?username=API-Error&pfpUrl=/default-avatar.jpg",
        302
      );
    }

    const neynarData = await neynarResponse.json();
    const user = neynarData.users?.[0];
    if (user) {
      console.log("User data fetched:", user.username, user.pfp_url);
      return NextResponse.redirect(
        `https://quote-production-679a.up.railway.app/?username=${encodeURIComponent(
          user.username
        )}&pfpUrl=${encodeURIComponent(user.pfp_url)}`,
        302
      );
    }

    console.log("No user data in Neynar response:", neynarData);
    return NextResponse.redirect(
      "https://quote-production-679a.up.railway.app/?username=No-User-Data&pfpUrl=/default-avatar.jpg",
      302
    );
  } catch (error) {
    console.error("Error in /api/frame:", error.message, error.stack);
    return NextResponse.redirect(
      "https://quote-production-679a.up.railway.app/?username=Server-Error&pfpUrl=/default-avatar.jpg",
      302
    );
  }
}
