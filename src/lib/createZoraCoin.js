import { createCoin } from "@zoralabs/coins-sdk";
import { publicClient } from "./viemConfig";

const ZERO = "0x0000000000000000000000000000000000000000";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // Validate inputs
    if (!walletClient) {
      throw new Error("Wallet client not provided.");
    }
    if (!creatorAddress || creatorAddress === ZERO) {
      throw new Error("Invalid creator address.");
    }
    if (!title || typeof title !== "string") {
      throw new Error("Title must be a non-empty string.");
    }
    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error("Image URL must be a non-empty string.");
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

    // Validate metadata URL accessibility
    try {
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        throw new Error(`Metadata URL inaccessible: ${response.statusText}`);
      }
      const metadata = await response.json();
      if (!metadata.name || !metadata.image) {
        throw new Error("Invalid metadata format: missing name or image.");
      }
    } catch (error) {
      throw new Error(`Metadata validation failed: ${error.message}`);
    }

    // Check wallet balance for gas fees
    const balance = await publicClient.getBalance({ address: creatorAddress });
    const MIN_BALANCE = 10n ** 16n;
    if (balance < MIN_BALANCE) {
      throw new Error(
        "Insufficient ETH for gas fees. Please fund your wallet."
      );
    }
    // Define coin parameters with explicit type handling
    const coinParams = {
      name: title,
      symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      platformReferrer: ZERO, // optional
      tickLower: -199200, // required lower tick for Base native-ETH pool
      initialPurchaseWei: 0n, // no initial purchase
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
