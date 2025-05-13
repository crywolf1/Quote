import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";

// Pinata API endpoints
const PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

// Pinata credentials from environment variables
const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

// Headers for Pinata API calls
const headers = {
  pinata_api_key: pinataApiKey,
  pinata_secret_api_key: pinataSecretApiKey,
};

export async function POST(req) {
  try {
    console.log("IPFS Metadata API called using Pinata");

    // Parse request body
    const metadata = await req.json();
    console.log("Received metadata request for IPFS:", {
      name: metadata.name,
      description: metadata.description?.substring(0, 50) + "...", // Truncate for logging
      imageUrl:
        typeof metadata.image === "string"
          ? metadata.image.substring(0, 30) + "..."
          : "not a string",
    });

    // Validate required fields
    if (!metadata.name || !metadata.image) {
      console.error("Missing required metadata fields");
      return NextResponse.json(
        { error: "Name and image are required" },
        { status: 400 }
      );
    }

    // First, upload the image to IPFS via Pinata
    console.log(
      "Fetching image from URL for Pinata upload:",
      metadata.image.substring(0, 30) + "..."
    );

    // Fetch the image from the provided URL
    let imageData;
    try {
      const imageResponse = await axios.get(metadata.image, {
        responseType: "arraybuffer",
      });
      imageData = imageResponse.data;
    } catch (fetchError) {
      console.error("Failed to fetch image:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch image from URL" },
        { status: 500 }
      );
    }

    // Upload image to Pinata
    let ipfsImageUrl;
    try {
      // Create form data with the image
      const imageFormData = new FormData();
      const fileName = `quote-image-${Date.now()}.png`;

      imageFormData.append("file", Buffer.from(imageData), {
        filename: fileName,
        contentType: "image/png",
      });

      // Add metadata for the file
      imageFormData.append(
        "pinataMetadata",
        JSON.stringify({
          name: `Quote Image - ${metadata.name}`,
        })
      );

      // Add options for pinning
      imageFormData.append(
        "pinataOptions",
        JSON.stringify({
          cidVersion: 0,
        })
      );

      console.log("Uploading image to Pinata...");
      const imageResponse = await axios.post(PINATA_FILE_URL, imageFormData, {
        maxBodyLength: Infinity,
        headers: {
          ...headers,
          "Content-Type": `multipart/form-data; boundary=${imageFormData._boundary}`,
        },
      });

      console.log("Image uploaded to Pinata:", imageResponse.data);
      ipfsImageUrl = `ipfs://${imageResponse.data.IpfsHash}`;
    } catch (imageUploadError) {
      console.error("Failed to upload image to IPFS:", imageUploadError);
      return NextResponse.json(
        {
          error: `Failed to upload image to IPFS: ${imageUploadError.message}`,
        },
        { status: 500 }
      );
    }

    // Create the metadata JSON with the IPFS image URL
    const tokenMetadata = {
      name: metadata.name,
      description: metadata.description || `Quote token for "${metadata.name}"`,
      image: ipfsImageUrl,
      attributes: metadata.attributes || [],
    };

    console.log("Metadata to be uploaded:", {
      ...tokenMetadata,
      description: tokenMetadata.description.substring(0, 50) + "...",
    });

    // Upload metadata to Pinata
    try {
      console.log("Uploading metadata to Pinata...");
      const jsonResponse = await axios.post(
        PINATA_JSON_URL,
        {
          pinataContent: tokenMetadata,
          pinataMetadata: {
            name: `Quote Metadata - ${metadata.name}`,
          },
          pinataOptions: {
            cidVersion: 0,
          },
        },
        {
          headers,
        }
      );

      console.log("Metadata uploaded to Pinata:", jsonResponse.data);
      const ipfsMetadataUrl = `ipfs://${jsonResponse.data.IpfsHash}`;

      return NextResponse.json({
        success: true,
        ipfsUrl: ipfsMetadataUrl,
        imageUrl: ipfsImageUrl,
        metadataDetails: tokenMetadata,
      });
    } catch (metadataUploadError) {
      console.error("Failed to upload metadata to IPFS:", metadataUploadError);
      return NextResponse.json(
        {
          error: `Failed to upload metadata to IPFS: ${metadataUploadError.message}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("IPFS metadata error:", error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    );
  }
}
