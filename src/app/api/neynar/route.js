// src/app/api/neynar/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fid = searchParams.get("fid");

  if (!fid) {
    return NextResponse.json({ error: "FID is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_key: process.env.NEYNAR_API_KEY,
        },
        body: JSON.stringify({ fids: [parseInt(fid)] }),
      }
    );

    if (!response.ok) {
      throw new Error(`Neynar API Error: ${response.status}`);
    }

    const json = await response.json();
    const user = json.users?.[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      fid: user.fid,
    });
  } catch (error) {
    console.error("Error fetching Neynar user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
