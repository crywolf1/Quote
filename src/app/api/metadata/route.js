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
    console.log("Metadata API called");

    // Parse request body
    const metadata = await req.json();
    console.log("Received metadata request:", {
      name: metadata.name,
      description: metadata.description?.substring(0, 50) + "...", // Truncate for logging
      image:
        typeof metadata.image === "string"
          ? metadata.image.startsWith("data:")
            ? "data:[base64 string]" // Don't log entire base64
            : metadata.image
          : "not a string",
    });

    if (!metadata.name || !metadata.image) {
      console.error("Missing required metadata fields:", {
        hasName: !!metadata.name,
        hasImage: !!metadata.image,
      });
      return NextResponse.json(
        { error: "Name and image are required" },
        { status: 400 }
      );
    }

    // Process the image
    let imageUrl = metadata.image;

    // If image is a base64 string, upload to Cloudinary
    if (imageUrl.startsWith("data:image")) {
      console.log("Image is base64, uploading to Cloudinary");
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          // Generate a unique ID for this upload
          const uniqueId = `token-${uuidv4().substring(0, 8)}`;
          console.log("Generated unique ID for image:", uniqueId);

          // Upload to Cloudinary
          cloudinary.v2.uploader.upload(
            imageUrl,
            {
              folder: "zora-tokens",
              public_id: uniqueId,
              resource_type: "image",
              format: "png",
            },
            (error, result) => {
              if (error) {
                console.error("Image upload error:", error);
                reject(error);
              } else {
                console.log(
                  "Image upload successful, new URL:",
                  result.secure_url
                );
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
    } else {
      console.log("Using existing image URL:", imageUrl);
    }

    // Create final metadata with proper image URL
    const finalMetadata = {
      name: metadata.name,
      description: metadata.description || `Token for "${metadata.name}"`,
      image: imageUrl, // Use Cloudinary URL
      attributes: metadata.attributes || [],
    };

    console.log("Final metadata object:", {
      ...finalMetadata,
      description: finalMetadata.description.substring(0, 50) + "...", // Truncate for logging
    });

    // Upload metadata JSON to Cloudinary
    try {
      const metadataJson = JSON.stringify(finalMetadata, null, 2);
      const metadataId = `metadata-${Date.now()}`;
      console.log("Uploading metadata with ID:", metadataId);

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
              console.log("Metadata uploaded successfully:", result.secure_url);
              resolve(result);
            }
          }
        );
      });

      const responseObj = {
        success: true,
        url: uploadResult.secure_url,
      };

      console.log("Returning metadata URL:", responseObj.url);
      return NextResponse.json(responseObj);
    } catch (metadataError) {
      console.error("Metadata upload error:", metadataError);
      return NextResponse.json(
        { error: `Failed to store metadata: ${metadataError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Metadata creation error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    );
  }
}
