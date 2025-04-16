import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});

const client = new NeynarAPIClient(config);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return new Response(JSON.stringify({ error: "Address required" }), {
      status: 400,
    });
  }

  try {
    const user = await client.lookupUserByCustodyAddress(address);
    return new Response(
      JSON.stringify({
        username: user?.username,
        displayName: user?.displayName,
        pfpUrl: user?.pfp?.url,
        fid: user?.fid,
      }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
    });
  }
}
