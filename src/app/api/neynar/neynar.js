import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export async function GET(request) {
  if (!process.env.NEYNAR_API_KEY) {
    console.error("NEYNAR_API_KEY is not defined");
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

  try {
    // Get fid from URL search params
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      return Response.json({ error: "No FID provided" }, { status: 400 });
    }

    // Fetch user data from Neynar
    const userData = await client.lookupUser(fid);
    console.log("Neynar response:", userData);

    return Response.json({
      username: userData.display_name || userData.username,
      pfpUrl: userData.pfp_url,
      fid: userData.fid,
    });
  } catch (error) {
    console.error("Neynar API error:", error);
    return Response.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
