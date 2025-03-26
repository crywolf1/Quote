import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json();
  const { untrustedData } = body || {};
  const { fid } = untrustedData || {};

  if (!fid) {
    return NextResponse.json(
      { username: "Guest", pfpUrl: "/default-avatar.jpg" },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "";
  if (!apiKey) {
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

  if (!neynarResponse.ok) {
    return NextResponse.json(
      { username: "API Error", pfpUrl: "/default-avatar.jpg" },
      { status: 500 }
    );
  }

  const neynarData = await neynarResponse.json();
  const user = neynarData.users?.[0];
  if (user) {
    return NextResponse.redirect(
      `https://quote-production-679a.up.railway.app/?username=${encodeURIComponent(
        user.username
      )}&pfpUrl=${encodeURIComponent(user.pfp_url)}`,
      302
    );
  }

  return NextResponse.json(
    { username: "No User Data", pfpUrl: "/default-avatar.jpg" },
    { status: 400 }
  );
}
