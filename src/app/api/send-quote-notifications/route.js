import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";
import NotificationToken from "../../../lib/models/NotificationToken";
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

    // Array of possible title words (without $ prefix)
    const possibleTitles = [
      "WISDOM",
      "INSIGHT",
      "REFLECT",
      "PONDER",
      "INSPIRE",
      "THOUGHT",
      "MOMENT",
      "CLARITY",
      "SPARK",
      "FOCUS",
    ];

    // Array of inspirational messages (without quote content)
    const inspirationalMessages = [
      "Your daily wisdom is ready! Tap to discover today's insight.",
      "New inspiration awaits you! Open to reveal today's thought.",
      "Time for reflection! We've selected something special for you today.",
      "Your daily dose of wisdom has arrived. Tap to explore.",
      "Take a moment to reflect with today's featured quote.",
      "New perspective for your day! Tap to see what we've curated.",
      "Fresh insight awaits! Open to discover today's featured thought.",
      "Wisdom delivered! Check out what we've selected just for you.",
      "Today's inspiration is ready for you. Tap to view.",
      "A new thought to ponder has arrived. Open to see more.",
    ];

    // Filter tokens to only include valid FIDs
    const validTokens = activeTokens.filter(
      (token) =>
        token.fid &&
        (typeof token.fid === "number" ||
          (typeof token.fid === "string" && !isNaN(Number(token.fid))))
    );

    if (validTokens.length === 0) {
      console.log("No valid FIDs found in active tokens");
      return NextResponse.json(
        {
          success: false,
          message: "No valid FIDs found in active tokens",
        },
        { status: 404 }
      );
    }

    console.log(`Processing notifications for ${validTokens.length} users`);

    // For each user, prepare a personalized notification
    const notifications = [];
    const BASE_URL =
      process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app";

    // Get all quotes for fallback if needed
    const allQuotes = await Quote.find({});
    if (!allQuotes.length) {
      console.error("No quotes found in database");
      return NextResponse.json({ error: "No quotes found" }, { status: 404 });
    }

    // Process each user token
    for (const token of validTokens) {
      try {
        const userAddress = token.address;
        let quoteId;

        if (!userAddress) {
          console.log(`Skipping token ${token._id} - no user address found`);
          continue;
        }

        // Get the user's current 12h key
        const key = get12hKey(userAddress);

        // Try to find the user's quote of the day from cache
        const cache = await QuoteOfTheDayCache.findOne({ key }).populate(
          "quoteId"
        );

        if (cache && cache.quoteId) {
          // User has a cached quote - use it
          quoteId = cache.quoteId._id;
          console.log(`Found cached quote ${quoteId} for user ${userAddress}`);
        } else {
          // No cached quote - create one
          console.log(
            `No cached quote found for user ${userAddress}, creating new one`
          );
          const randomIndex = Math.floor(Math.random() * allQuotes.length);
          const randomQuote = allQuotes[randomIndex];
          quoteId = randomQuote._id;

          // Create a cache entry for this user
          await QuoteOfTheDayCache.create({
            key,
            quoteId: randomQuote._id,
          });

          console.log(
            `Created new cache entry with quote ${quoteId} for user ${userAddress}`
          );
        }

        // Get a random title from the possible titles list
        const randomTitleIndex = Math.floor(
          Math.random() * possibleTitles.length
        );
        const title = possibleTitles[randomTitleIndex];

        // Select random inspirational message for body (NO quote text)
        const randomMessageIndex = Math.floor(
          Math.random() * inspirationalMessages.length
        );
        const body = inspirationalMessages[randomMessageIndex];

        // Generate target URL with the user's quote
        const targetUrl = `${BASE_URL}/?source=notification&quoteId=${quoteId}`;

        // Store notification data
        notifications.push({
          fid: token.fid,
          title: title,
          body: body,
          targetUrl: targetUrl,
          quoteId: quoteId,
        });
      } catch (error) {
        console.error(
          `Error processing notification for token ${token._id}:`,
          error
        );
        // Continue with next token
      }
    }

    console.log(`Prepared ${notifications.length} personalized notifications`);

    if (notifications.length === 0) {
      return NextResponse.json(
        { error: "Failed to prepare any valid notifications" },
        { status: 500 }
      );
    }

    // Send individual notifications to each user
    let totalSent = 0;
    const results = [];

    // Process each notification individually
    for (const notification of notifications) {
      try {
        console.log(
          `Sending notification to FID ${notification.fid} with title "${notification.title}" for quoteId ${notification.quoteId}`
        );

        const response = await neynarClient.publishFrameNotifications({
          targetFids: [notification.fid], // Send to just this one user
          notification: {
            title: notification.title,
            body: notification.body,
            target_url: notification.targetUrl,
            uuid: getNotificationId(),
          },
        });

        const success =
          response.notification_deliveries?.some(
            (delivery) =>
              delivery.status === "success" && delivery.fid === notification.fid
          ) || false;

        if (success) {
          totalSent++;
        }

        results.push({
          fid: notification.fid,
          title: notification.title,
          quoteId: notification.quoteId,
          success: success,
        });

        // Add a small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Error sending notification to FID ${notification.fid}:`,
          error
        );
        results.push({
          fid: notification.fid,
          title: notification.title,
          quoteId: notification.quoteId,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Notification process completed",
      sent: totalSent,
      total: notifications.length,
      results: results,
    });
  } catch (error) {
    console.error("Error processing notifications:", error);
    return NextResponse.json(
      { error: "Failed to send notifications", details: error.message },
      { status: 500 }
    );
  }
}
