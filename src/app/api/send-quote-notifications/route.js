import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";
import neynarClient from "../../../lib/NeynarClient";
import { randomUUID } from "crypto";
// Initialize Neynar client with your API key using the v2 format

// Helper function to create a stable notification ID for deduplication
function getNotificationId() {
  return randomUUID();
}

export async function POST(request) {
  await dbConnect();

  try {
    console.log("Starting notification process:", new Date().toISOString());

    // Get today's Quote of the Day
    const quotes = await Quote.find({});
    if (!quotes.length) {
      console.error("No quotes found in database");
      return NextResponse.json({ error: "No quotes found" }, { status: 404 });
    }
    console.log(`Found ${quotes.length} quotes`);

    // Pick a random quote for today
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quoteOfTheDay = quotes[randomIndex];
    console.log(`Selected quote ID: ${quoteOfTheDay._id}`);

    // Format notification content with length limits
    const quoteOwner = quoteOfTheDay.username
      ? `@${quoteOfTheDay.username}`
      : quoteOfTheDay.displayName || "Unknown";

    // Ensure title is max 32 chars
    const title = `$${
      quoteOfTheDay.title?.toUpperCase() || "QUOTED"
    }`.substring(0, 32);

    // Ensure body is max 128 chars including the attribution
    const maxQuoteLength = 128 - quoteOwner.length - 5; // 5 chars for quote marks and dash
    const truncatedQuote =
      quoteOfTheDay.text.length > maxQuoteLength
        ? quoteOfTheDay.text.substring(0, maxQuoteLength - 3) + "..."
        : quoteOfTheDay.text;
    const body = `"${truncatedQuote}" — ${quoteOwner}`;

    const BASE_URL =
      process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app";
    const targetUrl = `${BASE_URL}/?source=notification&quoteId=${quoteOfTheDay._id}`;

    // Use Neynar's publishFrameNotifications API
    try {
      console.log("Sending notification via Neynar...");

      const response = await neynarClient.publishFrameNotifications({
        targetFids: [], // Empty array means send to all users with notifications enabled
        notification: {
          title: title,
          body: body,
          target_url: targetUrl,
          uuid: getNotificationId(), // Add this to prevent duplicate notifications
        },
      });

      console.log("Neynar response:", JSON.stringify(response, null, 2));

      return NextResponse.json({
        success: true,
        message: "Notification process completed",
        results: response,
      });
    } catch (error) {
      console.error("Error sending notifications via Neynar:", error);
      return NextResponse.json(
        { error: "Failed to send notifications", message: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing notifications:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
