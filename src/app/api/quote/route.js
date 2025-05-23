import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Quote from "../../../lib/models/Quote";
import cloudinary from "cloudinary";
import { v4 as uuidv4 } from "uuid";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    console.log("POST /api/quote - Request received");
    await dbConnect();

    let body;
    try {
      body = await req.json();
      console.log("Request body parsed");
    } catch (jsonErr) {
      console.error("JSON parse error:", jsonErr);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      text,
      title,
      creatorAddress,
      fid,
      username,
      displayName,
      pfpUrl,
      verifiedAddresses,
      dateKey,
      image,
      isPending,
      style,
      zoraTokenAddress,
      zoraTokenTxHash,
      tokenMetadataUrl,
      dexscreenerUrl,
      payoutRecipient,
      payoutRecipientUpdated,
      payoutRecipientUpdateHash,
      splitContractAddress,
      splitContractTxHash,
      platformPercentage,
      creatorPercentage,
      payoutRecipientUpdateError,
      payoutRecipientUpdateAttempted,
    } = body;

    console.log("Processing image upload");
    let imageUrl = "";
    if (image && image.startsWith("data:image")) {
      try {
        // Extract base64 string
        const base64Data = image.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        // Upload using upload_stream
        const uploadRes = await new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            {
              folder: "quotes",
              public_id: uuidv4(),
              overwrite: true,
            },
            (error, result) => {
              if (error) {
                console.error("Cloudinary error:", error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          stream.end(buffer);
        });

        imageUrl = uploadRes.secure_url;
        console.log("Image uploaded successfully:", imageUrl);
      } catch (uploadErr) {
        console.error("Image upload failed:", uploadErr);
        return NextResponse.json(
          { error: "Image upload failed" },
          { status: 500 }
        );
      }
    }

    // Create new quote document
    const newQuote = new Quote({
      text,
      title,
      creatorAddress,
      fid,
      username,
      displayName,
      pfpUrl,
      verifiedAddresses: verifiedAddresses || {
        eth_addresses: [],
        sol_addresses: [],
        primary: {
          eth_address: null,
          sol_address: null,
        },
      },
      dateKey,
      image: imageUrl, // This is the Cloudinary URL
      style: style || "dark",

      // Token fields
      zoraTokenAddress: zoraTokenAddress || null,
      zoraTokenTxHash: zoraTokenTxHash || null,
      tokenMetadataUrl: tokenMetadataUrl || null,
      dexscreenerUrl: dexscreenerUrl || null,

      // Status tracking
      isPending: typeof isPending === "boolean" ? isPending : false,

      // PayoutRecipient tracking
      payoutRecipient: payoutRecipient || null,
      payoutRecipientUpdated: payoutRecipientUpdated || false,
      payoutRecipientUpdateHash: payoutRecipientUpdateHash || null,

      // Split contract information
      splitContractAddress: splitContractAddress || null,
      splitContractTxHash: splitContractTxHash || null,
      platformPercentage: platformPercentage || null,
      creatorPercentage: creatorPercentage || null,

      // Error tracking
      payoutRecipientUpdateError: payoutRecipientUpdateError || null,
      payoutRecipientUpdateAttempted: payoutRecipientUpdateAttempted || false,
    });

    // Save to database
    const savedQuote = await newQuote.save();
    console.log("Quote saved to database");

    // Return response with quote data and explicitly include imageUrl
    return NextResponse.json({
      success: true,
      quote: {
        ...savedQuote.toObject(),
        imageUrl: imageUrl, // Explicitly include the imageUrl for the client
      },
    });
  } catch (error) {
    console.error("Error saving quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save quote" },
      { status: 500 }
    );
  }
}
export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const creatorAddress = searchParams.get("creatorAddress");

  try {
    let query = {};
    if (creatorAddress) query.creatorAddress = creatorAddress;

    // add .sort({ createdAt: -1 }) for newest first
    const quotes = await Quote.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ quotes }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}
