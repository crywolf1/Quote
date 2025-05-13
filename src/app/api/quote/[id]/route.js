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

    await connectDB();
    const quote = await Quote.findById(id);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Update text field
    quote.text = text;

    // Handle image update if provided
    if (image && updateImage) {
      // Extract the public_id from the existing URL if available
      let publicId = null;

      if (existingImageUrl && typeof existingImageUrl === "string") {
        // Parse Cloudinary URL to get public ID - typically in format:
        // https://res.cloudinary.com/[cloud_name]/image/upload/[transformations]/[public_id].[extension]
        const urlParts = existingImageUrl.split("/");
        if (urlParts.length >= 2) {
          // Get the filename without extension
          const fileNameWithExt = urlParts[urlParts.length - 1];
          const fileName = fileNameWithExt.split(".")[0];
          // Path typically includes folder structure
          const folder = urlParts[urlParts.length - 2];
          publicId = `${folder}/${fileName}`;
        }
      }

      try {
        // Upload method that will replace if public_id is provided
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadOptions = {
            folder: "zora-tokens",
            resource_type: "image",
            format: "png",
            overwrite: true, // Tell Cloudinary to overwrite
          };

          // If we have a public ID, use it to replace existing image
          if (publicId) {
            uploadOptions.public_id = publicId;
          } else {
            // Otherwise create a new ID
            uploadOptions.public_id = `token-${uuidv4().substring(0, 8)}`;
          }

          cloudinary.v2.uploader.upload(
            image,
            uploadOptions,
            (error, result) => {
              if (error) {
                console.error("Cloudinary upload error:", error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
        });

        // Update quote with new image URL
        quote.imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 }
        );
      }
    }

    // Save updated quote
    await quote.save();

    // Return the updated quote
    return NextResponse.json({ quote });
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
