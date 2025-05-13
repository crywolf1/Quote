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

// PUT handler for updating quotes
export async function PUT(req, { params }) {
  try {
    const id = params.id;
    const { text, image, existingImageUrl, updateImage } = await req.json();

    await dbConnect();
    const quote = await Quote.findById(id);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Update quote text
    quote.text = text;

    // Handle image update if provided
    if (image && updateImage) {
      try {
        // Extract the public_id from the existing URL if available
        let publicId = null;

        if (existingImageUrl && typeof existingImageUrl === "string") {
          console.log("Original image URL:", existingImageUrl);

          // More robust extraction of public_id
          const matches = existingImageUrl.match(/\/v\d+\/([^/]+\/[^.]+)/);
          if (matches && matches[1]) {
            publicId = matches[1];
            console.log("Extracted public ID (regex):", publicId);
          } else {
            // Fallback to your existing extraction method
            const url = existingImageUrl.split("?")[0];
            const urlNoExt = url.replace(/\.[^/.]+$/, "");
            const uploadIndex = urlNoExt.indexOf("/upload/");

            if (uploadIndex !== -1) {
              publicId = urlNoExt.substring(uploadIndex + 8);
              publicId = publicId.replace(/^v\d+\//, "");
              console.log("Fallback extracted public ID:", publicId);
            }
          }
        }

        // Upload new image, replacing existing one if possible
        const uploadOptions = {
          folder: publicId ? undefined : "zora-tokens", // Don't specify folder when replacing
          resource_type: "image",
          format: "png",
        };

        // If we have extracted a public ID, use it to replace the image
        if (publicId) {
          uploadOptions.public_id = publicId;
          uploadOptions.overwrite = true;
          uploadOptions.invalidate = true; // Force CDN cache invalidation
        }

        console.log("Cloudinary upload options:", uploadOptions);

        // Upload to Cloudinary with proper options
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.v2.uploader.upload(
            image,
            uploadOptions,
            (error, result) => {
              if (error) {
                console.error("Cloudinary upload error:", error);
                reject(error);
              } else {
                console.log("Cloudinary upload success:", result.public_id);
                resolve(result);
              }
            }
          );
        });

        // Update quote with the new image URL
        quote.imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return NextResponse.json(
          { error: `Failed to upload image: ${uploadError.message}` },
          { status: 500 }
        );
      }
    }

    // Save updated quote
    const updatedQuote = await quote.save();

    // Format response properly to match your frontend expectations
    return NextResponse.json({ quote: updatedQuote }, { status: 200 });
  } catch (error) {
    console.error("Error updating quote:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return NextResponse.json(
      { error: `Failed to update quote: ${error.message}` },
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
