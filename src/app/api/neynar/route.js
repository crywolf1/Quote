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
    try {
      const res = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Neynar API error for FID ${fid}:`, errorText);
        return NextResponse.json(
          {
            error: "API request failed",
            status: res.status,
            details: errorText,
          },
          { status: res.status }
        );
      }

      const data = await res.json();
      console.log("Neynar API response for FID:", data);

      if (!data.users || !data.users.length) {
        console.warn("User not found for fid:", fid);
        return NextResponse.json(
          { error: "User not found", raw: data },
          { status: 404 }
        );
      }

      return NextResponse.json({ users: data.users });
    } catch (error) {
      console.error("Error fetching user by FID:", error);
      return NextResponse.json(
        { error: "Failed to fetch user data", details: error.message },
        { status: 500 }
      );
    }
  }

  if (address) {
    try {
      const lower = address.toLowerCase();
      const res = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${lower}`,
        {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Neynar API error for address ${lower}:`, errorText);
        return NextResponse.json(
          {
            error: "API request failed",
            status: res.status,
            details: errorText,
          },
          { status: res.status }
        );
      }

      const data = await res.json();
      console.log("Neynar API response for address:", data);

      // Check if data[address] exists
      if (!data[lower] || !Array.isArray(data[lower]) || !data[lower].length) {
        console.warn("User not found for address:", lower);
        return NextResponse.json(
          { error: "No Farcaster account found for this address", raw: data },
          { status: 404 }
        );
      }

      return NextResponse.json({ users: data[lower] });
    } catch (error) {
      console.error("Error fetching user by address:", error);
      return NextResponse.json(
        { error: "Failed to fetch user data", details: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Provide 'fid' or 'address' as query param" },
    { status: 400 }
  );
}
