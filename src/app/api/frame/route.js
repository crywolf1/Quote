import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Frame POST body:", JSON.stringify(body));

    const { untrustedData } = body || {};
    const { fid } = untrustedData || {};
    console.log("FID from frame POST:", fid);

    if (!fid) {
      console.error("No FID in frame POST data");
      return NextResponse.json(
        { username: "Guest", pfpUrl: "/default-avatar.jpg" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "";
    if (!apiKey) {
      console.error("NEXT_PUBLIC_NEYNAR_API_KEY is not set!");
      return NextResponse.json(
        { username: "No API Key", pfpUrl: "/default-avatar.jpg" },
        { status: 500 }
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
    console.log("Neynar API status:", neynarResponse.status);
    const neynarText = await neynarResponse.text();
    console.log("Neynar API raw response:", neynarText);

    if (!neynarResponse.ok) {
      console.error("Neynar API error:", neynarText);
      return NextResponse.json(
        { username: "API Error", pfpUrl: "/default-avatar.jpg" },
        { status: 500 }
      );
    }

    const neynarData = JSON.parse(neynarText);
    const user = neynarData.users?.[0];
    if (user) {
      console.log("User data fetched:", user.username, user.pfp_url);
      return NextResponse.json(
        { username: user.username, pfpUrl: user.pfp_url },
        { status: 200 }
      );
    } else {
      console.warn("No users in Neynar response:", neynarData);
      return NextResponse.json(
        { username: "No User Data", pfpUrl: "/default-avatar.jpg" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("POST /api/frame error:", error.message, error.stack);
    return NextResponse.json(
      { username: "Fetch Error", pfpUrl: "/default-avatar.jpg" },
      { status: 500 }
    );
  }
}
