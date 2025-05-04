import { createCoin } from "@zoralabs/coins-sdk";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // 1. Create valid symbol (3-8 uppercase alphanumeric characters)
    let symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);
    if (symbol.length < 3) symbol = symbol.padEnd(3, "Q");

    // 2. Get IPFS metadata from server
    // Note: This relies on your /api/pin-metadata endpoint
    // which should return {uri: "ipfs://Qm..."}
    const pinRes = await fetch("/api/pin-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: title,
        description: `Quote token for "${title}"`,
        image: imageUrl,
        properties: {
          category: "social", // This is a Zora-specific field
        },
      }),
    });

    const { uri: ipfsUri } = await pinRes.json();
    if (!ipfsUri) throw new Error("Failed to pin metadata");

    // 3. Create the coin exactly as in the docs
    // Only include what the docs show as required
    const coinParams = {
      name: title,
      symbol,
      uri: ipfsUri,
      payoutRecipient: creatorAddress,
      // These are specifically required for ETH/WETH pairs
      currency: "0x4200000000000000000000000000000000000006", // Base ETH
      tickLower: -199200,
      initialPurchaseWei: 0n,
    };

    // 4. Call createCoin with minimal parameters
    const result = await createCoin(coinParams, walletClient, publicClient);

    return {
      address: result.address,
      txHash: result.hash,
    };
  } catch (error) {
    console.error("Coin creation error:", error);
    throw error;
  }
}
