// src/app/api/token/[address]/route.js
import dbConnect from "../../../../lib/db";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { address } = params;

    if (!address) {
      return NextResponse.json(
        { error: "Token address is required" },
        { status: 400 }
      );
    }

    // Clean the address - remove any whitespace and make lowercase for consistent comparison
    const cleanedAddress = address.trim().toLowerCase();

    const db = await dbConnect();
    const quotes = db.collection("quotes");

    // Find the quote that has this token address
    const quote = await quotes.findOne({
      zoraTokenAddress: { $regex: new RegExp(cleanedAddress, "i") },
    });

    if (!quote) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // Extract just the token-related information
    const tokenInfo = {
      tokenAddress: quote.zoraTokenAddress,
      tokenTxHash: quote.zoraTokenTxHash,
      metadataUrl: quote.tokenMetadataUrl,
      payoutRecipient: quote.payoutRecipient,
      splitContractAddress: quote.splitContractAddress,
      platformPercentage: quote.platformPercentage,
      creatorPercentage: quote.creatorPercentage,
      creatorAddress: quote.creatorAddress,
      title: quote.title,
    };

    return NextResponse.json(tokenInfo);
  } catch (error) {
    console.error("Error retrieving token information:", error);
    return NextResponse.json(
      { error: "Failed to retrieve token information" },
      { status: 500 }
    );
  }
}
