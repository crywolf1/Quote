import Quote from "../../../lib/models/Quote";
import QuoteOfTheDayCache from "../../../lib/models/QuoteOfTheDayCache";
import dbConnect from "../../../lib/db";
import { NextResponse } from "next/server";

function get12hKey(address) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = now.getUTCHours();
  const period = hour < 12 ? "00" : "12";
  return `${address}_${year}-${month}-${day}-${period}`;
}

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

  const key = get12hKey(userAddress);

  // Check persistent cache first
  let cache = await QuoteOfTheDayCache.findOne({ key }).populate("quoteId");
  if (cache && cache.quoteId) {
    return NextResponse.json({ quote: cache.quoteId });
  }

  // Get all quotes
  const quotes = await Quote.find({});
  if (!quotes.length) {
    return NextResponse.json({ error: "No quotes found" }, { status: 404 });
  }
  // Pick a random quote
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[randomIndex];

  // Store in persistent cache for this 12h window
  await QuoteOfTheDayCache.create({ key, quoteId: quote._id });

  return NextResponse.json({ quote });
}
