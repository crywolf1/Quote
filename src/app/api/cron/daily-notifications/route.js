import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// This endpoint can be triggered by a cron job
export async function GET(request) {
  console.log("Daily notifications cron triggered", new Date().toISOString());

  try {
    const API_KEY = process.env.NOTIFICATION_API_KEY;
    const BASE_URL =
      process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app";

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

    const data = await response.json();
    console.log("Notification request completed", {
      status: response.status,
      hasTokens: data.message !== "No active notification tokens",
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error triggering notifications:", error);
    return NextResponse.json(
      { error: "Failed to trigger notifications" },
      { status: 500 }
    );
  }
}
