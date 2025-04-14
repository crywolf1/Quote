import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export async function GET(request) {
  if (!process.env.NEYNAR_API_KEY) {
    console.error("NEYNAR_API_KEY not found");
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      return Response.json({ error: "FID is required" }, { status: 400 });
    }

    const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY);
    const response = await neynar.lookupUser(fid);

    if (!response?.result?.user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      users: [
        {
          ...response.result.user,
        },
      ],
    });
  } catch (error) {
    console.error("Neynar API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
