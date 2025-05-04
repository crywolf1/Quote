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

    // 2. Basic metadata
    const metadata = {
      name: title,
      description: `Quote token for "${title}"`,
      image: imageUrl,
      properties: { category: "social" },
    };

    // 3. Pin to IPFS server-side
    const pinRes = await fetch("/api/pin-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    const { uri: ipfsUri, error } = await pinRes.json();
    if (!ipfsUri) throw new Error(error || "Failed to pin metadata");

    // 4. Use the IPFS URI directly
    const coinParams = {
      name: title,
      symbol,
      uri: ipfsUri, // ipfs://Qm... format
      payoutRecipient: creatorAddress,
      // Only include required parameters
      initialPurchaseWei: 0n, // Not sending ETH with transaction
    };

    // 5. Create the coin
    const result = await createCoin(coinParams, walletClient, publicClient);
    return { address: result.address, txHash: result.hash };
  } catch (error) {
    console.error("Coin creation error:", error);
    throw error;
  }
}
