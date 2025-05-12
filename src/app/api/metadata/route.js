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

    // Process the image
    let imageUrl = metadata.image;

    // If image is a base64 string, upload to Cloudinary
    if (imageUrl.startsWith("data:image")) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          // Extract base64 data
          const base64Data = imageUrl.split(",")[1];

          // Upload to Cloudinary
          cloudinary.v2.uploader.upload(
            imageUrl,
            {
              folder: "zora-tokens",
              public_id: `token-${uuidv4().substring(0, 8)}`,
              resource_type: "image",
              format: "png",
            },
            (error, result) => {
              if (error) {
                console.error("Image upload error:", error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
        });

        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        return NextResponse.json(
          { error: `Image upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }
    }

    // Create final metadata with proper image URL
    const finalMetadata = {
      name: metadata.name,
      description: metadata.description || `Token for "${metadata.name}"`,
      image: imageUrl, // Use Cloudinary URL
      attributes: metadata.attributes || [],
    };

    // Upload metadata JSON to Cloudinary
    try {
      const metadataJson = JSON.stringify(finalMetadata, null, 2);
      const metadataId = `metadata-${Date.now()}`;

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.v2.uploader.upload(
          "data:application/json;base64," +
            Buffer.from(metadataJson).toString("base64"),
          {
            folder: "metadata",
            public_id: metadataId,
            resource_type: "raw",
            format: "json",
          },
          (error, result) => {
            if (error) {
              console.error("Metadata upload error:", error);
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
    } catch (metadataError) {
      console.error("Metadata upload error:", metadataError);
      return NextResponse.json(
        { error: `Failed to store metadata: ${metadataError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Metadata creation error:", error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    );
  }
}
