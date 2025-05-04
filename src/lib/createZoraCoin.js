import { createCoin } from "@zoralabs/coins-sdk";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // 1. Create valid symbol
    let symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);
    if (symbol.length < 3) symbol = symbol.padEnd(3, "Q");

    // 2. Create metadata using the imageUrl
    const metadata = {
      name: title,
      description: `Quote token for "${title}"`,
      image: imageUrl,
      properties: {
        category: "social",
      },
    };

    // 3. Upload metadata to IPFS via your server route
    const pinRes = await fetch("/api/pin-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    const { uri: ipfsUri } = await pinRes.json();
    if (!ipfsUri) throw new Error("Failed to pin metadata");

    // 4. Use the generated IPFS URI
    const coinParams = {
      name: title,
      symbol,
      uri: ipfsUri, // Use dynamically created URI
      payoutRecipient: creatorAddress,
      platformReferrer: "0x0000000000000000000000000000000000000000",
    };

    const result = await createCoin(coinParams, walletClient, publicClient);
    return { address: result.address, txHash: result.hash };
  } catch (error) {
    console.error("Coin creation error:", error);
    throw error;
  }
}
