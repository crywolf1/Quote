import Quote from "../../../lib/models/Quote";
import dbConnect from "../../../lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get("userAddress");
  if (!userAddress) {
    return NextResponse.json(
      { error: "Missing user address" },
      { status: 400 }
    );
  }

  try {
    // Get all quotes (optionally filter by user, or not)
    const quotes = await Quote.find({});
    if (!quotes.length) {
      return NextResponse.json({ error: "No quotes found" }, { status: 404 });
    }
    // Pick a random quote
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];
    return NextResponse.json({ quote });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch quote of the day" },
      { status: 500 }
    );
  }
}
