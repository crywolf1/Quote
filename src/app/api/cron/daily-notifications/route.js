import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// This endpoint can be triggered by a cron job
export async function GET(request) {
  console.log("Daily notifications cron triggered", new Date().toISOString());

  try {
    const API_KEY = process.env.NOTIFICATION_API_KEY;
    // Use request URL to determine the base URL dynamically
    const url = new URL(request.url);
    const BASE_URL = `${url.protocol}//${url.host}`;

    console.log(`Using dynamically determined BASE_URL: ${BASE_URL}`);

    if (!API_KEY) {
      console.error("Missing NOTIFICATION_API_KEY in environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    console.log("Calling notifications endpoint");

    // Call the notification sender API
    const response = await fetch(`${BASE_URL}/api/send-quote-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Error response from notifications endpoint: ${response.status}`,
        errorText
      );
      return NextResponse.json(
        {
          error: `Notification request failed with status: ${response.status}`,
          details: errorText,
        },
        { status: 500 }
      );
    }

    // Parse the JSON response
    const data = await response.json();
    console.log("Notification request completed successfully", {
      status: response.status,
      sent: data.sent || 0,
      total: data.total || 0,
    });

    // Return a proper response
    return NextResponse.json({
      success: true,
      message: "Daily notifications processed",
      timestamp: new Date().toISOString(),
      results: data,
    });
  } catch (error) {
    console.error("Error triggering notifications:", error);
    return NextResponse.json(
      { error: "Failed to trigger notifications", details: error.message },
      { status: 500 }
    );
  }
}
