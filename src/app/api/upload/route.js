import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // 1) grab the raw image bytes
    const arrayBuffer = await req.arrayBuffer();

    // 2) build FormData for Pinata
    const formData = new FormData();
    const file = new Blob([arrayBuffer], { type: "image/png" });
    formData.append("file", file, "quote.png");
    // optional: give the pin a name or key
    formData.append("pinataMetadata", JSON.stringify({ name: "quote-image" }));

    // 3) call Pinata
    const pinataRes = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        },
        body: formData,
      }
    );

    if (!pinataRes.ok) {
      const err = await pinataRes.text();
      throw new Error(`Pinata error: ${err}`);
    }

    const { IpfsHash } = await pinataRes.json();
    // return a gateway‐friendly URL (or ipfs://…
    const url = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
