import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import NotificationToken from "../../../lib/models/NotificationToken";

export async function GET(request) {
  try {
    await dbConnect();

    // Get counts of notification tokens
    const totalTokens = await NotificationToken.countDocuments({});
    const activeTokens = await NotificationToken.countDocuments({
      isActive: true,
    });

    // Get the 5 most recent tokens
    const recentTokens = await NotificationToken.find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("fid isActive lastUpdated lastNotified eventHistory");

    // Sanitize the token data (don't expose actual tokens)
    const sanitizedTokens = recentTokens.map((token) => ({
      fid: token.fid,
      isActive: token.isActive,
      lastUpdated: token.lastUpdated,
      lastNotified: token.lastNotified,
      recentEvents: token.eventHistory?.slice(-3) || [],
    }));

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      stats: {
        totalTokens,
        activeTokens,
        inactiveTokens: totalTokens - activeTokens,
      },
      recentTokens: sanitizedTokens,
    });
  } catch (error) {
    console.error("Error getting webhook status:", error);
    return NextResponse.json(
      { error: "Failed to get webhook status" },
      { status: 500 }
    );
  }
}
