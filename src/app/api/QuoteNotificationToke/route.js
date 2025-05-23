import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import NotificationToken from "../../../lib/models/NotificationToken";

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    // If FID provided, get specific token
    if (fid) {
      const token = await NotificationToken.findOne({ fid });
      if (!token) {
        return NextResponse.json(
          {
            success: false,
            message: "No token found for this FID",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        token: {
          fid: token.fid,
          isActive: token.isActive,
          lastUpdated: token.lastUpdated,
          events: token.eventHistory?.length || 0,
        },
      });
    }

    // Otherwise get summary of all tokens
    const activeTokens = await NotificationToken.countDocuments({
      isActive: true,
    });
    const inactiveTokens = await NotificationToken.countDocuments({
      isActive: false,
    });

    return NextResponse.json({
      success: true,
      summary: {
        activeTokens,
        inactiveTokens,
        total: activeTokens + inactiveTokens,
      },
    });
  } catch (error) {
    console.error("Error retrieving token data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { fid, token, force } = body;

    if (!fid) {
      return NextResponse.json(
        { success: false, error: "FID is required" },
        { status: 400 }
      );
    }

    // Check if token already exists
    const existingToken = await NotificationToken.findOne({ fid });

    if (existingToken && !force) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Token already exists for this FID. Use force=true to override.",
          token: {
            fid: existingToken.fid,
            isActive: existingToken.isActive,
            lastUpdated: existingToken.lastUpdated,
          },
        },
        { status: 409 }
      );
    }

    // Create or update token
    const updateData = {
      fid,
      isActive: true,
      lastUpdated: new Date(),
      $push: {
        eventHistory: {
          event: "manual_token_update",
          timestamp: new Date(),
        },
      },
    };

    if (token) updateData.token = token;

    const updatedToken = await NotificationToken.findOneAndUpdate(
      { fid },
      updateData,
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: existingToken ? "Token updated" : "Token created",
      token: {
        fid: updatedToken.fid,
        isActive: updatedToken.isActive,
        lastUpdated: updatedToken.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Error saving token data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      return NextResponse.json(
        { success: false, error: "FID is required" },
        { status: 400 }
      );
    }

    const result = await NotificationToken.findOneAndDelete({ fid });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "No token found for this FID",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token deleted successfully",
      fid,
    });
  } catch (error) {
    console.error("Error deleting token:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
