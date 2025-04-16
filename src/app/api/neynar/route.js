import { NextResponse } from "next/server";

export default async function handler(req, res) {
  const { fid, address } = req.query;

  try {
    let user;

    if (fid) {
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: { api_key: process.env.NEYNAR_API_KEY },
        }
      );
      const data = await response.json();
      user = data.users?.[0];
    } else if (address) {
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
        {
          headers: { api_key: process.env.NEYNAR_API_KEY },
        }
      );
      const data = await response.json();
      user = data.users?.[0];
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      username: user.username || "Guest",
      pfpUrl: user.pfp_url || "/default-avatar.jpg",
    });
  } catch (error) {
    console.error("Neynar API error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
  console.log("Looking up:", fid ? `fid: ${fid}` : `address: ${address}`);
}
