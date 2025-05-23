import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";
import NotificationToken from "../../../lib/models/NotificationToken";
import NotificationHistory from "../../../lib/models/NotificationHistory";
import neynarClient from "../../../lib/NeynarClient";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// This endpoint can be triggered by a cron job
export async function GET(request) {
  console.log("Daily notifications cron triggered", new Date().toISOString());

  try {
    // IMPORTANT: Instead of making a fetch request,
    // we'll implement the notification logic directly
    await dbConnect();

    console.log("Connected to database, starting notification process");

    // Get active notification tokens with valid FIDs
    const activeTokens = await NotificationToken.find({
      isActive: true,
      fid: { $exists: true, $ne: null },
    });

    console.log(`Found ${activeTokens.length} active notification subscribers`);

    if (activeTokens.length === 0) {
      console.log("No active subscribers, skipping notification");
      return NextResponse.json(
        {
          success: false,
          message: "No active subscribers with valid FIDs",
        },
        { status: 404 }
      );
    }

    // Get quotes that haven't been sent recently
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let quoteQuery = {
      $or: [
        { lastSent: { $exists: false } },
        { lastSent: { $lt: thirtyDaysAgo } },
      ],
    };

    let quotes = await Quote.find(quoteQuery);

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

    // Format notification content
    const quoteOwner = quoteOfTheDay.username
      ? `@${quoteOfTheDay.username}`
      : quoteOfTheDay.displayName || "Unknown";

    const title = `$${
      quoteOfTheDay.title?.toUpperCase() || "QUOTED"
    }`.substring(0, 32);

    const introMessages = [
      "📜 Today's wisdom: ",
      "💫 Quote of the day: ",
      "✨ Today's inspiration: ",
      "🌟 Wisdom for today: ",
      "📣 Daily quote: ",
    ];

    const introMessage =
      introMessages[Math.floor(Math.random() * introMessages.length)];

    const maxQuoteLength = 128 - introMessage.length - quoteOwner.length - 5;
    const truncatedQuote =
      quoteOfTheDay.text.length > maxQuoteLength
        ? quoteOfTheDay.text.substring(0, maxQuoteLength - 3) + "..."
        : quoteOfTheDay.text;

    const body = `${introMessage}"${truncatedQuote}" — ${quoteOwner}`;

    const BASE_URL =
      process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app";
    const targetUrl = `${BASE_URL}/?source=notification&quoteId=${
      quoteOfTheDay._id
    }&campaign=daily&ts=${Date.now()}`;

    // Get valid FIDs
    const targetFids = activeTokens
      .map((token) => token.fid)
      .filter(
        (fid) =>
          typeof fid === "number" ||
          (typeof fid === "string" && !isNaN(Number(fid)))
      );

    if (targetFids.length === 0) {
      console.log("No valid FIDs found in active tokens");
      return NextResponse.json(
        {
          success: false,
          message: "No valid FIDs found in active tokens",
        },
        { status: 404 }
      );
    }

    console.log(`Filtered to ${targetFids.length} valid FIDs for notification`);

    // Create stable notification ID
    const today = new Date().toISOString().split("T")[0];
    const notificationId = `quote-${quoteOfTheDay._id}-${today}`;

    // Send notification
    console.log(
      `Sending notification to ${targetFids.length} users via Neynar...`
    );

    try {
      const response = await neynarClient.publishFrameNotifications({
        targetFids: targetFids,
        notification: {
          title: title,
          body: body,
          target_url: targetUrl,
          uuid: notificationId,
        },
      });

      console.log("Neynar response received");

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
      }

      // Update lastNotified timestamp
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
      });
    } catch (error) {
      console.error("Error sending notifications via Neynar:", error);
      return NextResponse.json(
        { error: "Failed to send notifications", message: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in daily notifications cron:", error);
    return NextResponse.json(
      { error: "Failed to trigger notifications", details: error.message },
      { status: 500 }
    );
  }
}
