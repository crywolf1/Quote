// src/app/api/neynar/route.js

import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      console.error("Missing FID");
      return NextResponse.json({ error: "Missing FID" }, { status: 400 });
    }

    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          accept: "application/json",
          api_key: NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Neynar API Error:", errorData);
      return NextResponse.json(
        { error: "Failed to fetch from Neynar" },
        { status: 500 }
      );
    }

    const json = await response.json();
    const user = json.users[0];

    if (!user) {
      console.error("User not found in Neynar response");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
    });
  } catch (err) {
    console.error("API Route Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
