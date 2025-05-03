import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";
import cloudinary from "cloudinary";
import { v4 as uuidv4 } from "uuid";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST handler for creating quotes
export async function POST(req) {
  try {
    console.log("POST /api/quote - Request received");
    await dbConnect();

    let body;
    try {
      body = await req.json();
    } catch (jsonErr) {
      console.error("JSON parse error:", jsonErr);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      text,
      creatorAddress,
      fid,
      username,
      displayName,
      pfpUrl,
      verifiedAddresses,
      dateKey,
      image,
    } = body;

    let imageUrl = "";
    if (image && image.startsWith("data:image")) {
      try {
        const base64Data = image.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        const uploadRes = await new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            {
              folder: "quotes",
              public_id: uuidv4(),
              overwrite: true,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(buffer);
        });

        imageUrl = uploadRes.secure_url;
      } catch (uploadErr) {
        console.error("Image upload error:", uploadErr);
      }
    }

    const newQuote = new Quote({
      text,
      creatorAddress,
      fid,
      username,
      displayName,
      pfpUrl,
      verifiedAddresses,
      dateKey,
      image: imageUrl,
    });

    await newQuote.save();

    return NextResponse.json({ success: true, quote: newQuote });
  } catch (error) {
    console.error("Error saving quote:", error);
    return NextResponse.json(
      { error: "Failed to save quote" },
      { status: 500 }
    );
  }
}

// GET handler for fetching quotes
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const creatorAddress = searchParams.get("creatorAddress");

    const query = creatorAddress ? { creatorAddress } : {};
    const quotes = await Quote.find(query).sort({ createdAt: -1 });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}
