import { NextResponse } from "next/server";
import neynarClient from "../../../lib/NeynarClient";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    // First, check if we have notification tokens
    const tokenResponse = await neynarClient.fetchNotificationTokens({
      limit: 100,
    });

    const tokens = tokenResponse?.notification_tokens || [];

    // Then send a test notification using the example endpoint structure from docs
    const notificationPayload = {
      targetFids: [], // Empty to target all users
      notification: {
        title: "Test from Quoted App",
        body: "This is a test notification from your Quoted app",
        target_url:
          process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app",
        uuid: randomUUID(),
      },
      filters: {}, // No filters
    };

    // Send notification
    const notificationResponse = await neynarClient.publishFrameNotifications(
      notificationPayload
    );

    return NextResponse.json({
      success: true,
      tokens_found: tokens.length,
      notification_sent: notificationResponse,
      manifest_url: `${
        process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app"
      }/.well-known/farcaster.json`,
      next_steps: [
        "1. Verify your farcaster.json has the correct webhookUrl",
        "2. Force refresh your manifest in Warpcast (Settings > Developer Tools)",
        "3. Add your app using sdk.actions.addMiniApp() in Card.js",
      ],
    });
  } catch (error) {
    console.error("Error verifying Neynar setup:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
