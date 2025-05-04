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

    // 2. Use a stable, direct HTTPS URL for metadata
    // This skips IPFS pinning/propagation issues
    const metadataUrl = "https://quote-dusky.vercel.app/metadata.json";

    // 3. Simple parameters that match Zora docs
    const coinParams = {
      name: title,
      symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      platformReferrer: "0x0000000000000000000000000000000000000000",
    };

    // 4. Create the coin
    const result = await createCoin(coinParams, walletClient, publicClient);
    return { address: result.address, txHash: result.hash };
  } catch (error) {
    console.error("Coin creation error:", error);
    throw error;
  }
}
