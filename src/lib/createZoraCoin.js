import { createCoin } from "@zoralabs/coins-sdk";
import { uploadMetadataToIPFS } from "./uploadToIPFS";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    let symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);
    if (symbol.length < 3) symbol = (symbol + "QQQ").substring(0, 3);

    // 1. Prepare metadata
    const metadata = {
      name: title,
      description: `Quote token for "${title}"`,
      image: imageUrl, // This can be a Cloudinary HTTPS URL, but for best results, upload the image to IPFS too
      properties: { category: "social" },
    };

    // 2. Upload metadata to IPFS
    const metadataUri = await uploadMetadataToIPFS(metadata);

    // 3. Create coin with IPFS URI
    const coinParams = {
      name: title,
      symbol,
      uri: metadataUri, // <-- must be ipfs://...
      payoutRecipient: creatorAddress,
      owners: [creatorAddress],
      tickLower: -199200,
      initialPurchaseWei: 0n,
    };

    const result = await createCoin(coinParams, walletClient, publicClient);

    return {
      address: result.address,
      txHash: result.hash,
    };
  } catch (error) {
    console.error("Error creating Zora coin:", error);
    throw error;
  }
}
