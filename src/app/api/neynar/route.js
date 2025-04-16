import { NextResponse } from "next/server";

export async function GET(request) {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");
  const address = searchParams.get("address");

  // FID lookup using GET with fids query param
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
      return NextResponse.json(
        { error: "User not found", raw: data },
        { status: 404 }
      );
    }
    return NextResponse.json({ users: data.users });
  }

  // Address lookup using GET with addresses query param
  if (address) {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address.toLowerCase()}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      }
    );
    const data = await res.json();
    // The response is an object with addresses as keys
    const users = data[address.toLowerCase()] || [];
    if (!users.length) {
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
