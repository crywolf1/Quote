// src/app/api/neynar/route.js

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");

  if (!fid) {
    return Response.json({ error: "FID is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_key: process.env.NEYNAR_API_KEY, // 🛡️ Make sure this is in your Railway env vars
      },
      body: JSON.stringify({ fids: [parseInt(fid)] }),
    });

    const result = await res.json();

    const user = result.users?.[0];
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      username: user.username,
      pfpUrl: user.pfp_url,
    });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
