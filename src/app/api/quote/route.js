import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";

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
      // Extract base64 data
      const base64Data = image.split(",")[1];
      // Generate a unique filename
      const filename = `${uuidv4()}.png`;
      // Path to save the image
      const filePath = path.join(process.cwd(), "public", "quotes", filename);
      // Save the file
      await writeFile(filePath, Buffer.from(base64Data, "base64"));
      // Public URL to access the image
      imageUrl = `/quotes/${filename}`;
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
      image: imageUrl, // Save the URL, not the base64
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
