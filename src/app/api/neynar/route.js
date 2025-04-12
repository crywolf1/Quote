// src/app/api/neynar/route.js

import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    console.log("🔥 Incoming request to /api/neynar with fid:", fid);

    if (!fid) {
      console.warn("❌ Missing fid in query params");
      return NextResponse.json({ error: "Missing fid" }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      console.error("❌ Missing NEYNAR_API_KEY in env");
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          "Content-Type": "application/json",
          api_key: apiKey,
        },
      }
    );

    const data = await response.json();
    console.log("✅ Neynar API response:", data);

    if (!data.users || data.users.length === 0) {
      console.warn("❌ No users found for fid:", fid);
      return NextResponse.json({ error: "Users not found" }, { status: 404 });
    }

    const user = data.users[0];

    return NextResponse.json({
      username: user.username,
      pfpUrl: user.pfp_url,
      fid: user.fid,
    });
  } catch (error) {
    console.error("❌ Error in /api/neynar:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
