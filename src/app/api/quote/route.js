import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";

export async function POST(req) {
  try {
    await dbConnect();

    const {
      text,
      creatorAddress,
      fid,
      username,
      displayName,
      pfpUrl,
      verifiedAddresses,
      dateKey, // Accept from client or generate if you want
    } = await req.json();

    if (!text || !creatorAddress || !fid) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a new Quote instance (dateKey can be optional or just today's date)
    const newQuote = new Quote({
      text,
      creatorAddress,
      fid,
      username,
      displayName,
      pfpUrl,
      verifiedAddresses,
      dateKey: dateKey || new Date().toISOString(), // or remove if not needed
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
