import { NextResponse } from "next/server";
import neynarClient from "../../../lib/NeynarClient";
import { randomUUID } from "crypto"; // Add this import

export async function GET(request) {
  try {
    // Get FID from query params (e.g., ?fid=12345)
    const url = new URL(request.url);
    const fid = url.searchParams.get("fid");

    // Default test message
    const title = "🧪 Test Notification";
    const body =
      "This is a test notification from Quote app. If you see this, it's working!";
    const target_url =
      process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app";

    // Create a proper UUID for testing - THIS IS THE KEY CHANGE
    const notificationId = randomUUID();

    // Log API key (partially masked for security)
    const apiKey = process.env.NEYNAR_API_KEY || "";
    const maskedKey = apiKey
      ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
      : "NOT_FOUND";
    console.log(`Using Neynar API key: ${maskedKey}`);

    // Validate FID if provided
    let targetFids = [];
    if (fid) {
      const parsedFid = parseInt(fid, 10);
      if (isNaN(parsedFid) || parsedFid <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid FID format. Must be a positive integer.",
          },
          { status: 400 }
        );
      }
      targetFids = [parsedFid];
    }

    console.log(
      `Sending test notification to ${fid ? `FID ${fid}` : "all users"}`
    );

    // Create the request payload for logging
    const requestPayload = {
      targetFids,
      notification: {
        title,
        body,
        target_url,
        uuid: notificationId,
      },
    };

    console.log("Request payload:", JSON.stringify(requestPayload, null, 2));

    // Send the notification
    const response = await neynarClient.publishFrameNotifications(
      requestPayload
    );

    console.log("Neynar response:", JSON.stringify(response, null, 2));

    return NextResponse.json({
      success: true,
      message: "Test notification sent",
      target: fid ? `FID ${fid}` : "all users with notifications enabled",
      payload: requestPayload, // Include the payload in the response for debugging
      response,
    });
  } catch (error) {
    console.error("Error testing Neynar notifications:", error);

    // Attempt to extract more detailed error information
    let detailedError = error.message;
    if (error.response) {
      console.error(
        "Error response data:",
        JSON.stringify(error.response.data || {}, null, 2)
      );
      console.error("Error response status:", error.response.status);
      console.error(
        "Error response headers:",
        JSON.stringify(error.response.headers || {}, null, 2)
      );

      detailedError = {
        message: error.message,
        status: error.response.status,
        data: error.response.data || {},
      };
    }

    return NextResponse.json(
      {
        success: false,
        error: detailedError,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
