import { createCoin } from "@zoralabs/coins-sdk";
import { publicClient } from "./viemConfig";
const ZERO = "0x0000000000000000000000000000000000000000";

export async function createZoraCoin({
  walletClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // Validate walletClient
    if (!walletClient) {
      throw new Error("Wallet client not provided.");
    }

    // Build symbol: Convert title to uppercase, remove non-alphanumeric, limit to 8 chars
    let symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);
    if (symbol.length < 3) symbol = symbol.padEnd(3, "Q");

    // Metadata URL: Construct URL for /api/metadata endpoint
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL;
    const metadataUrl =
      `${base}/api/metadata` +
      `?title=${encodeURIComponent(title)}` +
      `&image=${encodeURIComponent(imageUrl)}`;

    // Define coin parameters per Zora Coins SDK CreateCoinArgs
    const coinParams = {
      name: title,
      symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      platformReferrer: ZERO, // Optional: Zero address for no referrer
      tickLower: -199200, // Uniswap v3 default lower tick
      initialPurchaseWei: 0n, // No initial ETH purchase
    };

    // Log parameters for debugging
    console.log("Creating Zora coin with params:", coinParams);

    // Create the coin
    const { address, hash } = await createCoin(
      coinParams,
      walletClient,
      publicClient
    );

    // Log transaction hash for tracing
    console.log("Coin creation transaction hash:", hash);

    return { address, txHash: hash };
  } catch (error) {
    console.error("Error creating Zora coin:", error);
    if (error.cause?.data) {
      console.error("Revert data:", error.cause.data);
      console.error("Error details:", JSON.stringify(error, null, 2));
    }
    throw new Error(`Failed to create Zora coin: ${error.message}`);
  }
}
