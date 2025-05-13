import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import FormData from "form-data";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Pinata API endpoints
const PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

// Pinata credentials
const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

export async function POST(req) {
  try {
    console.log("[UPDATE TOKEN] Metadata API called");

    // Parse request body
    const metadata = await req.json();
    console.log("[UPDATE TOKEN] Received metadata request:", {
      name: metadata.name,
      description: metadata.description?.substring(0, 50) + "...", // Truncate for logging
      image:
        typeof metadata.image === "string"
          ? metadata.image.substring(0, 50) + "..."
          : "not a string",
    });

    // Validate metadata
    if (!metadata.name || !metadata.image) {
      console.error("[UPDATE TOKEN] Missing required metadata fields");
      return NextResponse.json(
        { error: "Name and image are required" },
        { status: 400 }
      );
    }

    // Check if Pinata credentials are available
    if (!pinataApiKey || !pinataSecretApiKey) {
      console.error("[UPDATE TOKEN] Missing Pinata API credentials");
      return NextResponse.json(
        { error: "Pinata API credentials not configured" },
        { status: 500 }
      );
    }

    // 1. First, ensure we have the image on Pinata
    let ipfsImageUrl;
    try {
      console.log(
        "[UPDATE TOKEN] Fetching image from URL:",
        metadata.image.substring(0, 50) + "..."
      );

      // Fetch the image
      const imageResponse = await fetch(metadata.image);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      // Convert to buffer for Pinata
      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(imageArrayBuffer);

      // Create form data for Pinata upload
      const imageFormData = new FormData();
      const fileName = `quote-image-${Date.now()}.png`;

      imageFormData.append("file", imageBuffer, {
        filename: fileName,
        contentType: "image/png",
      });

      // Add metadata for the file
      imageFormData.append(
        "pinataMetadata",
        JSON.stringify({
          name: `Quote Image - ${metadata.name}`,
          keyvalues: {
            timestamp: Date.now().toString(),
          },
        })
      );

      // Set Pinata options
      imageFormData.append(
        "pinataOptions",
        JSON.stringify({
          cidVersion: 0,
        })
      );

      console.log("[UPDATE TOKEN] Uploading image to Pinata...");

      // Upload image to Pinata
      const pinataHeaders = {
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey,
        "Content-Type": `multipart/form-data; boundary=${imageFormData._boundary}`,
      };

      const imageUploadResponse = await axios.post(
        PINATA_FILE_URL,
        imageFormData,
        {
          maxBodyLength: Infinity,
          headers: pinataHeaders,
          timeout: 30000, // 30 second timeout
        }
      );

      if (!imageUploadResponse.data || !imageUploadResponse.data.IpfsHash) {
        throw new Error("Invalid response from Pinata image upload");
      }

      ipfsImageUrl = `ipfs://${imageUploadResponse.data.IpfsHash}`;
      console.log(
        "[UPDATE TOKEN] Image successfully uploaded to IPFS:",
        ipfsImageUrl
      );
    } catch (imageError) {
      console.error("[UPDATE TOKEN] Image upload to IPFS failed:", imageError);
      console.log("[UPDATE TOKEN] Falling back to original image URL");
      // Fall back to original image URL if IPFS upload fails
      ipfsImageUrl = metadata.image;
    }

    // 2. Create the final metadata with the IPFS image URL
    const finalMetadata = {
      name: metadata.name,
      description: metadata.description || `Token for "${metadata.name}"`,
      image: ipfsImageUrl, // Use IPFS URL if available, otherwise original URL
      attributes: [
        ...(metadata.attributes || []),
        {
          trait_type: "Last Updated",
          value: new Date().toISOString(),
        },
      ],
    };

    console.log("[UPDATE TOKEN] Final metadata to upload:", {
      name: finalMetadata.name,
      description: finalMetadata.description.substring(0, 50) + "...",
      image: finalMetadata.image,
    });

    // 3. Upload metadata JSON to Pinata
    try {
      console.log("[UPDATE TOKEN] Uploading metadata to Pinata...");

      const pinataResponse = await axios.post(
        PINATA_JSON_URL,
        {
          pinataContent: finalMetadata,
          pinataMetadata: {
            name: `Token Metadata Update - ${metadata.name}`,
            keyvalues: {
              timestamp: Date.now().toString(),
            },
          },
          pinataOptions: {
            cidVersion: 0,
          },
        },
        {
          headers: {
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretApiKey,
          },
          timeout: 30000,
        }
      );

      if (!pinataResponse.data || !pinataResponse.data.IpfsHash) {
        throw new Error("Invalid response from Pinata metadata upload");
      }

      const ipfsMetadataUrl = `ipfs://${pinataResponse.data.IpfsHash}`;
      console.log(
        "[UPDATE TOKEN] Metadata successfully uploaded to IPFS:",
        ipfsMetadataUrl
      );

      // 4. Test gateway access to ensure it's retrievable (important!)
      try {
        // Test if we can access the metadata through a public gateway
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${pinataResponse.data.IpfsHash}`;
        console.log("[UPDATE TOKEN] Testing gateway access:", gatewayUrl);

        const gatewayResponse = await axios.get(gatewayUrl, {
          timeout: 5000,
          validateStatus: null, // Don't throw on non-2xx responses
        });

        console.log(
          "[UPDATE TOKEN] Gateway response status:",
          gatewayResponse.status
        );

        if (gatewayResponse.status !== 200) {
          console.warn(
            "[UPDATE TOKEN] Warning: Metadata might not be immediately accessible:",
            gatewayResponse.status
          );
        }
      } catch (gatewayError) {
        console.warn(
          "[UPDATE TOKEN] Gateway access test failed:",
          gatewayError.message
        );
        // Continue anyway - sometimes IPFS takes time to propagate
      }

      // 5. Also upload to Cloudinary as backup
      try {
        console.log(
          "[UPDATE TOKEN] Also uploading metadata to Cloudinary as backup"
        );
        const metadataJson = JSON.stringify(finalMetadata, null, 2);
        const metadataId = `update-${Date.now()}`;

        const cloudinaryResult = await new Promise((resolve, reject) => {
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
                console.error(
                  "[UPDATE TOKEN] Cloudinary backup failed:",
                  error
                );
                reject(error);
              } else {
                console.log(
                  "[UPDATE TOKEN] Metadata backup created:",
                  result.secure_url
                );
                resolve(result);
              }
            }
          );
        });

        // Return both URLs
        return NextResponse.json({
          success: true,
          ipfsUrl: ipfsMetadataUrl, // Primary URL for Zora
          url: cloudinaryResult.secure_url, // Backup URL
        });
      } catch (cloudinaryError) {
        console.warn(
          "[UPDATE TOKEN] Cloudinary backup failed:",
          cloudinaryError
        );
        // Still return the IPFS URL even if Cloudinary backup fails
        return NextResponse.json({
          success: true,
          ipfsUrl: ipfsMetadataUrl,
          url: ipfsMetadataUrl, // Same as ipfsUrl as fallback
        });
      }
    } catch (metadataError) {
      console.error(
        "[UPDATE TOKEN] Metadata upload to IPFS failed:",
        metadataError
      );
      return NextResponse.json(
        {
          error: `Failed to upload metadata to IPFS: ${metadataError.message}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[UPDATE TOKEN] Error processing request:", error);
    return NextResponse.json(
      { error: `Failed to process update: ${error.message}` },
      { status: 500 }
    );
  }
}
