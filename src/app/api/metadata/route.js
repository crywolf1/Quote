import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import { v4 as uuidv4 } from "uuid";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const metadata = await req.json();

    if (!metadata.name || !metadata.image) {
      return NextResponse.json(
        { error: "Name and image are required" },
        { status: 400 }
      );
    }

    // First, make sure we have a proper image URL
    let imageUrl = metadata.image;

    // If the image is a base64 string, upload it to Cloudinary first
    if (imageUrl.startsWith("data:image")) {
      try {
        // Extract base64 string
        const base64Data = imageUrl.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        // Upload using upload_stream
        const uploadRes = await new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            {
              folder: "zora-tokens",
              public_id: uuidv4(),
              overwrite: true,
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          stream.end(buffer);
        });

        imageUrl = uploadRes.secure_url;
      } catch (uploadErr) {
        console.error("Image upload failed:", uploadErr);
        return NextResponse.json(
          { error: "Image upload failed" },
          { status: 500 }
        );
      }
    }

    // Update metadata with proper image URL
    const finalMetadata = {
      ...metadata,
      image: imageUrl,
    };

    // Store metadata as a JSON file in Cloudinary
    const metadataString = JSON.stringify(finalMetadata);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.v2.uploader.upload(
        "data:application/json;base64," +
          Buffer.from(metadataString).toString("base64"),
        {
          folder: "metadata",
          resource_type: "raw",
          public_id: `metadata-${Date.now()}`,
          format: "json",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary metadata upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
    });
  } catch (error) {
    console.error("Metadata creation error:", error);
    return NextResponse.json(
      { error: `Failed to create metadata: ${error.message}` },
      { status: 500 }
    );
  }
}
