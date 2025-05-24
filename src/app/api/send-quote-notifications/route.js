import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";
import QuoteOfTheDayCache from "../../../lib/models/QuoteOfTheDayCache";
import neynarClient from "../../../lib/NeynarClient";
import { randomUUID } from "crypto";

// Helper function to create a stable notification ID for deduplication
function getNotificationId() {
  return randomUUID();
}

// Helper function to get the current 12h key format
function get12hKey(address) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = now.getUTCHours();
  const period = hour < 12 ? "00" : "12";
  return `${address}_${year}-${month}-${day}-${period}`;
}

export async function POST(request) {
  await dbConnect();

  try {
    console.log("Starting notification process:", new Date().toISOString());

    // Array of possible title words (without $ prefix)
    const possibleTitles = [
      "THE LAW",
      "THE CUT",
      "A TRUTH",
      "DAILY EDGE",
      "COLD FACT",
      "THE STRATEGY",
      "A LESSON",
      "THE SIGNAL",
      "NOISELESS",
      "THE DROP",
      "THE SHIFT",
      "A WARNING",
      "TODAY'S MOVE",
      "THE PLAY",
    ];
    // Array of inspirational messages (without quote content)
    const darkerMessages = [
      "Today's law is written. Tap to learn or ignore.",
      "Insight arrives without warning. Be ready.",
      "The truth doesn’t care if you open it.",
      "Power speaks softly today. Will you hear it?",
      "A cold quote just landed. Look — or don’t.",
      "One sentence. One shift. One edge.",
      "Open if you dare. It cuts.",
      "A quote to disarm or armor you.",
      "Don’t just scroll. Read with intent.",
      "Something real made it through. Tap to see.",
    ];

    // Get all quotes for fallback if needed
    const allQuotes = await Quote.find({});
    if (!allQuotes.length) {
      console.error("No quotes found in database");
      return NextResponse.json({ error: "No quotes found" }, { status: 404 });
    }

    // Select a random quote
    const randomIndex = Math.floor(Math.random() * allQuotes.length);
    const quoteOfTheDay = allQuotes[randomIndex];
    console.log(`Selected quote ID: ${quoteOfTheDay._id}`);

    // Get a random title from the possible titles list
    const randomTitleIndex = Math.floor(Math.random() * possibleTitles.length);
    const title = possibleTitles[randomTitleIndex];

    // Select random inspirational message for body (NO quote text)
    const randomMessageIndex = Math.floor(
      Math.random() * inspirationalMessages.length
    );
    const body = inspirationalMessages[randomMessageIndex];

    const BASE_URL =
      process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app";
    const targetUrl = `${BASE_URL}/?source=notification&quoteId=${quoteOfTheDay._id}`;

    // Send a broadcast notification directly through Neynar (without targeting specific FIDs)
    console.log("Sending broadcast notification via Neynar");

    // Note: Empty targetFids array sends to all subscribers
    const response = await neynarClient.publishFrameNotifications({
      targetFids: [], // Empty array means send to all subscribers
      notification: {
        title: title,
        body: body,
        target_url: targetUrl,
        uuid: getNotificationId(),
      },
    });

    console.log("Neynar response:", response);

    // Count deliveries
    const deliveryCount = response.notification_deliveries?.length || 0;
    const successCount =
      response.notification_deliveries?.filter(
        (delivery) => delivery.status === "success"
      ).length || 0;

    return NextResponse.json({
      success: true,
      message: "Broadcast notification sent",
      sent: successCount,
      total: deliveryCount,
      quoteId: quoteOfTheDay._id,
    });
  } catch (error) {
    console.error("Error processing notifications:", error);
    return NextResponse.json(
      { error: "Failed to send notifications", details: error.message },
      { status: 500 }
    );
  }
}
