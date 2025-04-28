import dbConnect from "../../../lib/db"; // Your MongoDB connection function
import Quote from "../../../lib/models/Quote"; // Your Quote model
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// Schema for cached daily quote
const dailyQuoteSchema = new mongoose.Schema({
  dateKey: { type: String, required: true, unique: true },
  quote: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
});

const DailyQuote =
  mongoose.models.DailyQuote || mongoose.model("DailyQuote", dailyQuoteSchema);

export async function GET() {
  try {
    await dbConnect();

    // Get today's date key (e.g., 2025-04-28)
    const today = new Date();
    const dateKey = today.toISOString().slice(0, 10);

    // Check if quote already picked for today
    const existing = await DailyQuote.findOne({ dateKey });
    if (existing) {
      return NextResponse.json({ quote: existing.quote });
    }

    // Pick a random quote
    const randomQuote = await Quote.aggregate([{ $sample: { size: 1 } }]);
    if (!randomQuote || randomQuote.length === 0) {
      return NextResponse.json({ quote: null });
    }

    const selectedQuote = randomQuote[0];

    // Save it for today
    const newQuoteOfTheDay = new DailyQuote({
      dateKey,
      quote: selectedQuote,
    });
    await newQuoteOfTheDay.save();

    return NextResponse.json({ quote: selectedQuote });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
