import { NextResponse } from "next/server";
import cloudinary from "cloudinary";

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

    // Instead of writing to filesystem (which fails on Vercel),
    // store the metadata as a JSON file in Cloudinary
    const metadataString = JSON.stringify(metadata);

    // Upload the JSON to Cloudinary as a raw file
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
