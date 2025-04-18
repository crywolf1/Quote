// /pages/api/cast.js (or /api/cast route)
export default async function handler(req, res) {
  const { address, text } = req.body;

  // 1. Get user FID by address
  const userData = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
    {
      headers: { api_key: process.env.NEYNAR_API_KEY },
    }
  ).then((res) => res.json());

  const fid = userData?.users?.[0]?.fid;
  if (!fid) return res.status(404).json({ error: "Farcaster user not found" });

  // 2. Cast using your signer
  const castRes = await fetch("https://api.neynar.com/v2/farcaster/cast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      api_key: process.env.NEYNAR_API_KEY,
    },
    body: JSON.stringify({
      signer_uuid: process.env.SIGNER_UUID,
      text,
      reply_to: null, // or provide a parent hash if replying
    }),
  });

  if (castRes.ok) {
    res.status(200).json({ success: true });
  } else {
    res.status(500).json({ error: "Failed to cast" });
  }
}
