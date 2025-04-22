import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const client = new NeynarAPIClient(
  new Configuration({
    apiKey: process.env.NEYNAR_API_KEY,
  })
);

export async function POST(req) {
  try {
    const { text, signerUuid, fid } = await req.json();

    if (!text || !signerUuid || !fid) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    const result = await client.cast.publishCast(signerUuid, { text });

    return new Response(JSON.stringify({ cast: result }), { status: 200 });
  } catch (error) {
    console.error("Cast error:", error);
    return new Response(JSON.stringify({ error: "Failed to cast" }), {
      status: 500,
    });
  }
}
