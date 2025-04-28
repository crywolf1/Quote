import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";

export async function POST(req) {
  try {
    // Establish DB connection
    await dbConnect();

    // Extract necessary data from the request body
    const {
      text,
      creatorAddress,
      fid,
      username,
      displayName,
      pfpUrl,
      verifiedAddresses,
    } = await req.json();

    // Validate required fields
    if (!text || !creatorAddress || !fid) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get today's date in YYYY-MM-DD format for the dateKey
    const today = new Date().toISOString().split("T")[0]; // Example: "2025-04-28"

    // Create a new Quote instance
    const newQuote = new Quote({
      text,
      creatorAddress,
      fid,
      username,
      displayName,
      pfpUrl,
      verifiedAddresses,
      dateKey: today, // Store today's date as the unique key
    });

    // Check if a quote for today already exists
    const existingQuote = await Quote.findOne({
      dateKey: today,
      creatorAddress,
    });
    if (existingQuote) {
      return NextResponse.json(
        { error: "Quote for today already exists" },
        { status: 409 } // Conflict status
      );
    }

    // Save the new quote
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
