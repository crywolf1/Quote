import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";
import NotificationToken from "../../../lib/models/NotificationToken";
import NotificationHistory from "../../../lib/models/NotificationHistory"; // You may need to create this model
import neynarClient from "../../../lib/NeynarClient";
import { randomUUID } from "crypto";

// Helper function to create a stable notification ID for deduplication
function getNotificationId() {
  return randomUUID();
}

export async function POST(request) {
  await dbConnect();

  try {
    console.log("Starting notification process:", new Date().toISOString());

    // Check authorization if needed
    const authHeader = request.headers.get("Authorization");
    const API_KEY = process.env.NOTIFICATION_API_KEY;

    if (
      API_KEY &&
      (!authHeader ||
        !authHeader.startsWith("Bearer ") ||
        authHeader.slice(7) !== API_KEY)
    ) {
      console.error("Unauthorized notification attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active notification tokens
    const activeTokens = await NotificationToken.find({ isActive: true });
    console.log(`Found ${activeTokens.length} active notification subscribers`);

    if (activeTokens.length === 0) {
      console.log("No active subscribers, skipping notification");
      return NextResponse.json(
        {
          success: false,
          message: "No active subscribers",
        },
        { status: 404 }
      );
    }

    // Get quotes that haven't been sent recently (in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let quoteQuery = {
      $or: [
        { lastSent: { $exists: false } },
        { lastSent: { $lt: thirtyDaysAgo } },
      ],
    };

    let quotes = await Quote.find(quoteQuery);

    // If no quotes are available that haven't been sent recently, fall back to all quotes
    if (!quotes.length) {
      console.log("No unused quotes in the last 30 days, using all quotes");
      quotes = await Quote.find({});
    }

    if (!quotes.length) {
      console.error("No quotes found in database");
      return NextResponse.json({ error: "No quotes found" }, { status: 404 });
    }

    console.log(`Found ${quotes.length} eligible quotes`);

    // Pick a random quote for today
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quoteOfTheDay = quotes[randomIndex];
    console.log(`Selected quote ID: ${quoteOfTheDay._id}`);

    // Update the quote's lastSent date
    await Quote.findByIdAndUpdate(quoteOfTheDay._id, {
      lastSent: new Date(),
      sendCount: (quoteOfTheDay.sendCount || 0) + 1,
    });

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
    const targetUrl = `${BASE_URL}/?source=notification&quoteId=${
      quoteOfTheDay._id
    }&campaign=daily&ts=${Date.now()}`;

    // Get fids from active tokens
    const targetFids = activeTokens.map((token) => token.fid);

    // Create a notification ID that's stable for this quote on this day
    // This helps prevent duplicate notifications if the function runs multiple times
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const notificationId = `quote-${quoteOfTheDay._id}-${today}`;

    try {
      console.log(
        `Sending notification to ${targetFids.length} users via Neynar...`
      );

      const response = await neynarClient.publishFrameNotifications({
        targetFids: targetFids, // Target specific users with active tokens
        notification: {
          title: title,
          body: body,
          target_url: targetUrl,
          uuid: notificationId,
        },
      });

      console.log("Neynar response:", JSON.stringify(response, null, 2));

      // Track notification metrics
      const successCount =
        response.notification_deliveries?.filter(
          (delivery) => delivery.status === "success"
        ).length || 0;

      // Save notification history
      try {
        await NotificationHistory.create({
          quoteId: quoteOfTheDay._id,
          sentAt: new Date(),
          title,
          body,
          targetUrl,
          targetFidCount: targetFids.length,
          successCount,
          notificationId,
          deliveryDetails: response.notification_deliveries,
        });
      } catch (historyError) {
        console.error("Error saving notification history:", historyError);
        // Don't fail the whole request if history saving fails
      }

      // Update lastNotified timestamp for users who received notifications
      const successfulFids =
        response.notification_deliveries
          ?.filter((delivery) => delivery.status === "success")
          .map((delivery) => delivery.fid) || [];

      if (successfulFids.length > 0) {
        await NotificationToken.updateMany(
          { fid: { $in: successfulFids } },
          { $set: { lastNotified: new Date() } }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Notification process completed",
        sent: successCount,
        total: targetFids.length,
        quote: {
          id: quoteOfTheDay._id,
          truncated: truncatedQuote !== quoteOfTheDay.text,
        },
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
      { error: "Failed to send notifications", details: error.message },
      { status: 500 }
    );
  }
}
