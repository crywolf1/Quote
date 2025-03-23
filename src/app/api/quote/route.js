import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db"; // Import the dbConnect function
import Quote from "../../../lib/models/Quote"; // Import your model here

export async function POST(req) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Get the quote text from the request body
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Quote is required" }, { status: 400 });
    }

    // Create and save the new quote using the Quote model
    const newQuote = new Quote({ text });
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
  try {
    await dbConnect();
    const quotes = await Quote.find(); // Fetch all quotes from the database
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("❌ Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
