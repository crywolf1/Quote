import { NextResponse } from "next/server";

export async function GET(request) {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    console.error("Neynar API key not set");
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");
  const address = searchParams.get("address");

  console.log("Incoming request to /api/neynar with:");
  console.log("fid:", fid);
  console.log("address:", address);

  if (fid) {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      }
    );
    const data = await res.json();
    if (!data.users || !data.users.length) {
      console.warn("User not found for fid:", fid);
      return NextResponse.json(
        { error: "User not found", raw: data },
        { status: 404 }
      );
    }
    return NextResponse.json({ users: data.users });
  }

  if (address) {
    const lower = address.toLowerCase();
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${lower}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      }
    );
    const data = await res.json();
    const users = data[lower] || [];
    if (!users.length) {
      console.warn("User not found for address:", lower);
      return NextResponse.json(
        { error: "User not found", raw: data },
        { status: 404 }
      );
    }
    return NextResponse.json({ users });
  }

  return NextResponse.json(
    { error: "Provide 'fid' or 'address' as query param" },
    { status: 400 }
  );
}
