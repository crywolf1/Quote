import { createCoin } from "@zoralabs/coins-sdk";

// Use a known-working example from Zora docs
const WORKING_IPFS_URI =
  "ipfs://bafybeigoxzqzbnxsn35vq7lls3ljxdcwjafxvbvkivprsodzrptpiguysy";

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

    // 2. SKIP Pinata/IPFS altogether for first test
    // Use Zora's own example URI that we know works

    // 3. Use exact params from docs example
    const coinParams = {
      name: title,
      symbol,
      uri: WORKING_IPFS_URI, // <-- Use known working example URI
      payoutRecipient: creatorAddress,
      // Only include required params for first test
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
