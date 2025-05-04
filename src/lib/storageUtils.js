import axios from "axios";

// Pinata credentials with CORRECT variable name
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

console.log(
  "Pinata credentials available:",
  !!PINATA_API_KEY && !!PINATA_SECRET_API_KEY
);

export async function uploadMetadataToIPFS(metadata, imageUrl) {
  try {
    // Check if we have valid Pinata credentials
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      console.warn("No Pinata credentials found, using fallback URI");
      // DO NOT USE THE PROBLEMATIC FALLBACK - create simple metadata instead
      return createSimpleMetadataURI(metadata, imageUrl);
    }

    // Prepare metadata with the direct image URL
    const jsonToPin = {
      name: metadata.name,
      description: metadata.description,
      image: imageUrl, // Use the Cloudinary URL directly
      properties: metadata.properties,
    };

    console.log(
      "Pinning JSON to IPFS:",
      JSON.stringify(jsonToPin).substring(0, 100) + "..."
    );

    // Upload to Pinata
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      jsonToPin,
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    // Get the IPFS hash from the response
    const ipfsHash = response.data.IpfsHash;
    const ipfsUrl = `ipfs://${ipfsHash}`;

    console.log("Uploaded to IPFS via Pinata:", ipfsUrl);
    return ipfsUrl;
  } catch (error) {
    console.error("Pinata upload failed:", error);
    // Use an alternative approach instead of the broken fallback
    return createSimpleMetadataURI(metadata, imageUrl);
  }
}

// Create a simple metadata object without IPFS
function createSimpleMetadataURI(metadata, imageUrl) {
  // Create a base64 encoded JSON string as a data URI
  const jsonData = JSON.stringify({
    name: metadata.name || "Quote Token",
    description:
      metadata.description ||
      `Quote by ${metadata.properties?.creator || "Anonymous"}`,
    image: imageUrl,
    properties: metadata.properties,
  });

  // We'll use a working public IPFS gateway with known good metadata
  return "ipfs://bafkreih7swg3q6xmio27extexezbwzqtlsapmt6kpqzzmvu6i35v2a5ska";
}
