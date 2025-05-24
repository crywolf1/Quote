import dbConnect from "../../../lib/db";
import Quote from "@/lib/models/Quote";
import QuoteOfTheDayCache from "@/lib/models/QuoteOfTheDayCache";
import mongoose from "mongoose";

// Keep your existing GET method handler

// Add PUT method handler for like/unlike functionality
export async function PUT(req) {
  try {
    await dbConnect();

    const { quoteId, action, address } = await req.json();

    if (!quoteId || !address) {
      return Response.json(
        { success: false, message: "Quote ID and address are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(quoteId)) {
      return Response.json(
        { success: false, message: "Invalid quote ID" },
        { status: 400 }
      );
    }

    const quote = await Quote.findById(quoteId);

    if (!quote) {
      return Response.json(
        { success: false, message: "Quote not found" },
        { status: 404 }
      );
    }

    // Initialize likedBy array if it doesn't exist
    if (!quote.likedBy) {
      quote.likedBy = [];
    }

    if (action === "like") {
      // Add like if not already liked
      if (!quote.likedBy.includes(address)) {
        quote.likedBy.push(address);
        quote.likeCount = (quote.likeCount || 0) + 1;
        await quote.save();
      }
    } else if (action === "unlike") {
      // Remove like if already liked
      if (quote.likedBy.includes(address)) {
        quote.likedBy = quote.likedBy.filter((addr) => addr !== address);
        quote.likeCount = Math.max((quote.likeCount || 1) - 1, 0); // Prevent negative counts
        await quote.save();
      }
    } else {
      return Response.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      isLiked: quote.likedBy.includes(address),
      likeCount: quote.likeCount || 0,
    });
  } catch (error) {
    console.error("Error processing like action:", error);
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
