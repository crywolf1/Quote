import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const {
      text,
      creatorAddress,
      fid,
      username,
      displayName,
      pfpUrl,
      verifiedAddresses,
      dateKey,
      image, // data URL
    } = body;

    let imageUrl = "";
    if (image && image.startsWith("data:image")) {
      // Extract base64 string (remove "data:image/png;base64," part)
      const base64Data = image.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");

      // Upload using upload_stream
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
      image: imageUrl, // Save the Cloudinary URL
    });

    await newQuote.save();

    return NextResponse.json(
      { message: "Quote saved successfully!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error saving quote:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const creatorAddress = searchParams.get("creatorAddress");

  try {
    let quotes;
    if (creatorAddress) {
      quotes = await Quote.find({ creatorAddress });
    } else {
      quotes = await Quote.find({});
    }

    return NextResponse.json({ quotes }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}
