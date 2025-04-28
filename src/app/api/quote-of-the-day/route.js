import Quote from "../../../lib/models/Quote";
import dbConnect from "../../../lib/db";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// Simple in-memory cache for demo (replace with Redis or DB for production)
const quoteCache = {};

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

  // Check cache first
  if (quoteCache[key]) {
    return NextResponse.json({ quote: quoteCache[key] });
  }

  // Get all quotes
  const quotes = await Quote.find({});
  if (!quotes.length) {
    return NextResponse.json({ error: "No quotes found" }, { status: 404 });
  }
  // Pick a random quote
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[randomIndex];

  // Store in cache for this 12h window
  quoteCache[key] = quote;

  return NextResponse.json({ quote });
}
