import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");
  const address = searchParams.get("address");

  console.log("Incoming request to /api/farcaster with:");
  console.log("fid:", fid);
  console.log("address:", address);

  // Fetch by FID using Farcaster Hub API (no API key required)
  if (fid) {
    try {
      const res = await fetch(
        `https://hub.farcaster.xyz/v1/userDataByFid?fid=${fid}`
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Farcaster API error for FID ${fid}:`, errorText);
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
      if (!data || !data.result) {
        console.warn("User not found for fid:", fid);
        return NextResponse.json(
          { error: "User not found", raw: data },
          { status: 404 }
        );
      }
      return NextResponse.json({ user: data.result });
    } catch (error) {
      console.error("Error fetching user by FID:", error);
      return NextResponse.json(
        { error: "Failed to fetch user data", details: error.message },
        { status: 500 }
      );
    }
  }

  // Fetch by address using Farcaster Hub API (no API key required)
  if (address) {
    try {
      const lower = address.toLowerCase();
      const res = await fetch(
        `https://hub.farcaster.xyz/v1/userDataByAddress?address=${lower}`
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Farcaster API error for address ${lower}:`, errorText);
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
      if (!data || !data.result) {
        console.warn("User not found for address:", lower);
        return NextResponse.json(
          { error: "No Farcaster account found for this address", raw: data },
          { status: 404 }
        );
      }
      return NextResponse.json({ user: data.result });
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
