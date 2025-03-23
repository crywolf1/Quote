import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";

export async function POST(req) {
  try {
    await dbConnect();
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Quote is required" }, { status: 400 });
    }
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
    const quotes = await Quote.find();
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("❌ Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
