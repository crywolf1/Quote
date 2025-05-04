import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  const metadata = await request.json();
  const apiKey = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_SECRET_API_KEY;
  if (!apiKey || !secret) {
    console.error("Missing Pinata creds");
    return NextResponse.json(
      { error: "Missing Pinata credentials" },
      { status: 500 }
    );
  }
  try {
    const pinRes = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: apiKey,
          pinata_secret_api_key: secret,
        },
      }
    );
    return NextResponse.json({ uri: `ipfs://${pinRes.data.IpfsHash}` });
  } catch (e) {
    console.error("Pinata error:", e.response?.data || e.message);
    return NextResponse.json(
      { error: "Pinata upload failed" },
      { status: 502 }
    );
  }
}
