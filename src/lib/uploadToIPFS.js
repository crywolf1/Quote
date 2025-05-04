import axios from "axios";

/**
 * Uploads a JSON metadata object to Pinata and returns an ipfs:// URI.
 * Requires PINATA_API_KEY and PINATA_SECRET_API_KEY in .env.local
 */
export async function uploadMetadataToIPFS(metadata) {
  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    metadata,
    {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    }
  );
  return `ipfs://${res.data.IpfsHash}`;
}
