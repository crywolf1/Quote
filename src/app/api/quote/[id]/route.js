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

          // Try to delete the existing image first
          try {
            // Extract public_id using your current method
            const url = existingImageUrl.split("?")[0];
            const urlNoExt = url.replace(/\.[^/.]+$/, "");
            const uploadIndex = urlNoExt.indexOf("/upload/");
            if (uploadIndex !== -1) {
              publicId = urlNoExt.substring(uploadIndex + 8);
              publicId = publicId.replace(/^v\d+\//, "");
              console.log("Attempting to destroy existing image:", publicId);

              // Try to delete the existing image
              await new Promise((resolve) => {
                cloudinary.v2.uploader.destroy(publicId, (error) => {
                  if (error) {
                    console.log(
                      "Warning: Failed to delete existing image",
                      error
                    );
                  } else {
                    console.log("Successfully deleted existing image");
                  }
                  resolve();
                });
              });
            }
          } catch (deleteError) {
            console.log("Error deleting existing image:", deleteError);
            // Continue regardless of deletion success
          }

          // Generate a new unique ID - don't try to reuse the old one
          publicId = `zora-tokens/quote-${uuidv4().substring(0, 8)}`;
          console.log("Generated new public ID:", publicId);
        }

        // Upload as a new image with a unique ID
        const uploadOptions = {
          public_id:
            publicId || `zora-tokens/quote-${uuidv4().substring(0, 8)}`,
          resource_type: "image",
          format: "png",
        };

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

    // Check if this quote has been tokenized
    if (quote.zoraTokenAddress) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a quote that has been tokenized on the blockchain",
          tokenAddress: quote.zoraTokenAddress,
        },
        { status: 403 }
      );
    }

    // Delete image from Cloudinary if it exists
    if (quote.imageUrl && quote.imageUrl.includes("cloudinary.com")) {
      try {
        const url = quote.imageUrl.split("?")[0];
        const urlNoExt = url.replace(/\.[^/.]+$/, "");
        const uploadIndex = urlNoExt.indexOf("/upload/");
        let publicId = urlNoExt.substring(uploadIndex + 8);
        publicId = publicId.replace(/^v\d+\//, "");
        await cloudinary.v2.uploader.destroy(publicId);
        console.log("Deleted Cloudinary image:", publicId);
      } catch (cloudinaryError) {
        console.error(
          "Failed to delete image from Cloudinary:",
          cloudinaryError
        );
        // Continue with deletion even if image deletion fails
      }
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
    console.error("Error deleting quote:", error);
    return NextResponse.json(
      { error: `Failed to delete quote: ${error.message}` },
      { status: 500 }
    );
  }
}
