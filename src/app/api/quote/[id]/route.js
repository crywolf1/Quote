import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Quote from "@/lib/models/Quote";
import QuoteOfTheDayCache from "@/lib/models/QuoteOfTheDayCache";
import cloudinary from "cloudinary";
import { v4 as uuidv4 } from "uuid";

import { ObjectId } from "mongodb";
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// In your PUT handler:

export async function PUT(req, { params }) {
  try {
    const id = params.id;
    const { text, image, existingImageUrl, updateImage } = await req.json();

    // Change this line from connectDB() to dbConnect()
    await dbConnect();
    const quote = await Quote.findById(id);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Rest of your function remains the same...
  } catch (error) {
    console.error("Error updating quote:", error);
    return NextResponse.json(
      { error: "Failed to update quote" },
      { status: 500 }
    );
  }
}
export async function DELETE(req, { params }) {
  await dbConnect();
  try {
    const { id } = params;
    const quote = await Quote.findById(id);
    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Delete image from Cloudinary if it exists
    if (quote.image && quote.image.includes("cloudinary.com")) {
      const url = quote.image.split("?")[0];
      const urlNoExt = url.replace(/\.[^/.]+$/, "");
      const uploadIndex = urlNoExt.indexOf("/upload/");
      let publicId = urlNoExt.substring(uploadIndex + 8);
      publicId = publicId.replace(/^v\d+\//, "");
      await cloudinary.v2.uploader.destroy(publicId);
    }

    await Quote.findByIdAndDelete(id);

    // Delete all QuoteOfTheDayCache entries that reference this quote
    await QuoteOfTheDayCache.deleteMany({
      quoteId: ObjectId.createFromHexString(id),
    });

    return NextResponse.json(
      { message: "Quote and image deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete quote" },
      { status: 500 }
    );
  }
}
