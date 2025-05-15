import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";

// Pinata API endpoints
const PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

// Pinata credentials
const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

export async function POST(req) {
  try {
    console.log("Update Token Metadata API called");

    // Parse request body
    const metadata = await req.json();
    console.log("Received update request:", {
      name: metadata.name,
      description: metadata.description?.substring(0, 30) + "...",
      imageUrl: metadata.image?.substring(0, 30) + "...",
    });

    if (!metadata.name || !metadata.image) {
      return NextResponse.json(
        { error: "Name and image are required" },
        { status: 400 }
      );
    }

    // Verify Pinata credentials
    if (!pinataApiKey || !pinataSecretApiKey) {
      return NextResponse.json(
        { error: "Pinata API credentials not configured" },
        { status: 500 }
      );
    }

    // Step 1: Upload the image to Pinata
    console.log(
      "Fetching image from URL:",
      metadata.image.substring(0, 30) + "..."
    );

    try {
      // Fetch the image data
      const imageResponse = await axios.get(metadata.image, {
        responseType: "arraybuffer",
      });

      // Create form data for uploading to Pinata
      const imageFormData = new FormData();
      const imageBuffer = Buffer.from(imageResponse.data);

      // Generate a unique name for the image
      const timestamp = Date.now();
      const imageName = `quote-image-${timestamp}.png`;

      // Add the image to form data
      imageFormData.append("file", imageBuffer, {
        filename: imageName,
        contentType: "image/png",
      });

      // Add metadata for the image
      imageFormData.append(
        "pinataMetadata",
        JSON.stringify({
          name: `Quote Image - ${metadata.name}`,
          keyvalues: {
            timestamp: timestamp.toString(),
          },
        })
      );

      // Upload to Pinata
      console.log("Uploading image to IPFS via Pinata...");
      const imageUploadResponse = await axios.post(
        PINATA_FILE_URL,
        imageFormData,
        {
          maxBodyLength: Infinity,
          headers: {
            "Content-Type": `multipart/form-data; boundary=${imageFormData._boundary}`,
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretApiKey,
          },
        }
      );

      if (!imageUploadResponse.data || !imageUploadResponse.data.IpfsHash) {
        throw new Error("Failed to upload image to IPFS");
      }

      const imageIpfsHash = imageUploadResponse.data.IpfsHash;
      const ipfsImageUrl = `ipfs://${imageIpfsHash}`;
      console.log("Image uploaded to IPFS:", ipfsImageUrl);

      // Step 2: Create metadata JSON with IPFS image URL
      const tokenMetadata = {
        name: metadata.name,
        description: metadata.description || `Quote: ${metadata.name}`,
        image: ipfsImageUrl, // Use the IPFS URL, not Cloudinary
        attributes: metadata.attributes || [],
      };
      if (
        !tokenMetadata.attributes.some(
          (attr) => attr.trait_type === "Last Updated"
        )
      ) {
        tokenMetadata.attributes.push({
          trait_type: "Last Updated",
          value: new Date().toISOString(),
        });
      }

      console.log("Creating metadata JSON with IPFS image URL");

      // Step 3: Upload metadata JSON to Pinata
      const metadataResponse = await axios.post(
        PINATA_JSON_URL,
        {
          pinataContent: tokenMetadata,
          pinataMetadata: {
            name: `Quote Metadata - ${metadata.name}`,
            keyvalues: {
              timestamp: timestamp.toString(),
            },
          },
        },
        {
          headers: {
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretApiKey,
          },
        }
      );

      if (!metadataResponse.data || !metadataResponse.data.IpfsHash) {
        throw new Error("Failed to upload metadata to IPFS");
      }

      const metadataIpfsHash = metadataResponse.data.IpfsHash;
      const ipfsMetadataUrl = `ipfs://${metadataIpfsHash}`;
      console.log("Metadata uploaded to IPFS:", ipfsMetadataUrl);

      // Test if the metadata is accessible through a gateway
      try {
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`;
        console.log("Testing gateway access:", gatewayUrl);

        const testResponse = await axios.get(gatewayUrl, { timeout: 5000 });
        console.log("Gateway test successful, status:", testResponse.status);
      } catch (gatewayError) {
        console.warn(
          "Gateway test failed, but continuing:",
          gatewayError.message
        );
        // Continue anyway as IPFS can be slow to propagate
      }

      // Return both URLs for the client to use
      return NextResponse.json({
        success: true,
        ipfsUrl: ipfsMetadataUrl, // This is what Zora needs
        imageIpfsUrl: ipfsImageUrl,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`,
      });
    } catch (error) {
      console.error("Error in update-token-metadata:", error);
      return NextResponse.json(
        {
          error: "Failed to process update",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("General error in update-token-metadata:", error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    );
  }
}
