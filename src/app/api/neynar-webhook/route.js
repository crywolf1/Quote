import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "../../../lib/db";
import NotificationToken from "../../../lib/models/NotificationToken";

export async function POST(request) {
  console.log("🔔 Neynar webhook request received:", new Date().toISOString());

  try {
    // Get raw request body
    const rawBody = await request.text();
    console.log("Raw webhook payload:", rawBody);

    // Parse the request body first for better logging
    let requestBody;
    try {
      requestBody = JSON.parse(rawBody);
      console.log(
        "Parsed webhook payload:",
        JSON.stringify(requestBody, null, 2)
      );
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Verify the webhook signature before processing
    const signature = request.headers.get("x-neynar-signature");
    const timestamp = request.headers.get("x-neynar-timestamp");
    const webhookSecret = process.env.NEYNAR_WEBHOOK_SECRET;

    // Add detailed logging for debugging
    console.log(`Received signature: ${signature}`);
    console.log(`Received timestamp: ${timestamp}`);
    console.log(`Has webhook secret: ${!!webhookSecret}`);

    // Conditional verification - for development flexibility
    let signatureValid = true;
    if (webhookSecret) {
      signatureValid = verifyWebhookSignature(
        rawBody,
        signature,
        timestamp,
        webhookSecret
      );
      console.log(
        `Signature verification result: ${
          signatureValid ? "✅ Valid" : "❌ Invalid"
        }`
      );
    } else {
      console.warn("⚠️ No webhook secret configured - skipping verification");
    }

    // Only verify in production or if explicitly enabled
    const isVerificationRequired =
      process.env.NODE_ENV === "production" &&
      process.env.REQUIRE_WEBHOOK_VERIFICATION !== "false";

    if (isVerificationRequired && !signatureValid) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    await dbConnect();

    // Handle Neynar webhook events
    const { event, data } = requestBody;

    if (!event || !data) {
      console.error("Missing event or data in webhook payload");
      return NextResponse.json(
        { error: "Invalid webhook payload format" },
        { status: 400 }
      );
    }

    console.log(`📣 Processing event: ${event}`);

    // Handle different event types
    if (event === "notification_permission_granted") {
      const { fid, token, url } = data;

      if (!fid) {
        console.error("Missing fid in notification_permission_granted event");
        return NextResponse.json({ error: "Missing fid" }, { status: 400 });
      }

      console.log(
        `📬 Notifications enabled by FID: ${fid} with token: ${token?.substring(
          0,
          10
        )}...`
      );

      try {
        // Store or update the notification token - handle case where token might be missing
        const updateData = {
          fid,
          isActive: true,
          lastUpdated: new Date(),
          $push: {
            eventHistory: {
              event: "notification_permission_granted",
              timestamp: new Date(),
            },
          },
        };

        // Only update these fields if they exist in the data
        if (token) updateData.token = token;
        if (url) updateData.url = url;

        const updatedToken = await NotificationToken.findOneAndUpdate(
          { fid },
          updateData,
          { upsert: true, new: true }
        );

        console.log(`Token stored with ID: ${updatedToken._id}`);
      } catch (dbError) {
        console.error(`DB error storing token for FID ${fid}:`, dbError);
        // Continue processing - don't fail the webhook because of DB errors
      }
    } else if (event === "notification_permission_revoked") {
      const { fid } = data;

      if (!fid) {
        console.error("Missing fid in notification_permission_revoked event");
        return NextResponse.json({ error: "Missing fid" }, { status: 400 });
      }

      console.log(`🚫 Notifications disabled by FID: ${fid}`);

      try {
        // Update the token as inactive
        await NotificationToken.findOneAndUpdate(
          { fid },
          {
            isActive: false,
            lastUpdated: new Date(),
            $push: {
              eventHistory: {
                event: "notification_permission_revoked",
                timestamp: new Date(),
              },
            },
          }
        );
      } catch (dbError) {
        console.error(`DB error updating token for FID ${fid}:`, dbError);
        // Continue processing
      }
    } else if (event === "mini_app_added") {
      const { fid } = data;

      if (!fid) {
        console.error("Missing fid in mini_app_added event");
        return NextResponse.json({ error: "Missing fid" }, { status: 400 });
      }

      console.log(`📱 Mini app added by FID: ${fid}`);

      // When mini app is added, also track this in the database
      // Even without explicit notification permissions
      try {
        await NotificationToken.findOneAndUpdate(
          { fid },
          {
            fid,
            isActive: true, // Optimistically mark as active
            lastUpdated: new Date(),
            $push: {
              eventHistory: {
                event: "mini_app_added",
                timestamp: new Date(),
              },
            },
          },
          { upsert: true }
        );
      } catch (dbError) {
        console.error(
          `DB error processing mini_app_added for FID ${fid}:`,
          dbError
        );
      }
    } else if (event === "mini_app_removed") {
      const { fid } = data;

      if (!fid) {
        console.error("Missing fid in mini_app_removed event");
        return NextResponse.json({ error: "Missing fid" }, { status: 400 });
      }

      console.log(`🚫 Mini app removed by FID: ${fid}`);

      try {
        // Update any tokens for this user as inactive
        await NotificationToken.findOneAndUpdate(
          { fid },
          {
            isActive: false,
            lastUpdated: new Date(),
            $push: {
              eventHistory: {
                event: "mini_app_removed",
                timestamp: new Date(),
              },
            },
          }
        );
      } catch (dbError) {
        console.error(
          `DB error processing mini_app_removed for FID ${fid}:`,
          dbError
        );
      }
    } else {
      console.warn(`❓ Unknown event type: ${event}`);
    }

    // Always return success to acknowledge the webhook
    return NextResponse.json({
      success: true,
      event: event,
      processed: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing Neynar webhook:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to verify the webhook signature
function verifyWebhookSignature(payload, signature, timestamp, secret) {
  if (!signature || !timestamp || !secret) {
    console.error("Missing signature, timestamp, or secret for verification");
    return false;
  }

  try {
    // Create a signature using the same method Neynar uses
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(timestamp + "." + payload)
      .digest("hex");

    // For easier debugging
    console.log(`Expected signature: ${expectedSignature.substring(0, 10)}...`);
    console.log(`Received signature: ${signature.substring(0, 10)}...`);

    // Compare signatures (use a constant-time comparison if possible)
    if (signature === expectedSignature) {
      return true;
    }

    if (
      crypto.timingSafeEqual &&
      signature.length === expectedSignature.length
    ) {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } else {
      // Fallback for environments without timingSafeEqual
      return signature === expectedSignature;
    }
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}
