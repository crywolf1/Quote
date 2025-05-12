import { createCoin } from "@zoralabs/coins-sdk";

// Zero address constant
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
    const symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);

    // Make sure symbol is at least 1 character
    const finalSymbol = symbol.length > 0 ? symbol : "QUOTE";

    // Metadata URL: Construct URL for /api/metadata endpoint
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || "https://quote-dusky.vercel.app";
    const metadataUrl =
      `${base}/api/metadata` +
      `?title=${encodeURIComponent(title)}` +
      `&image=${encodeURIComponent(imageUrl)}`;

    // Validate metadata URL
    try {
      console.log("Validating metadata URL:", metadataUrl);
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        throw new Error(`Metadata URL inaccessible: ${response.statusText}`);
      }
      const metadata = await response.json();
      console.log("Metadata validation result:", metadata);
      if (!metadata.name || !metadata.image) {
        throw new Error("Invalid metadata format: missing name or image.");
      }
    } catch (error) {
      throw new Error(`Metadata validation failed: ${error.message}`);
    }

    // Check wallet balance for gas fees
    const balance = await publicClient.getBalance({ address: creatorAddress });
    const MIN_BALANCE = 10n ** 16n; // 0.01 ETH
    if (balance < MIN_BALANCE) {
      throw new Error(
        "Insufficient ETH for gas fees. Please fund your wallet."
      );
    }

    // Define coin parameters
    const coinParams = {
      name: title,
      symbol: finalSymbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      // Omit optional parameters for maximum compatibility
    };

    // Log parameters for debugging
    console.log("Creating Zora coin with params:", coinParams);

    // Create the coin with minimal required parameters
    const { address, hash } = await createCoin(
      coinParams,
      walletClient,
      publicClient
    );

    console.log("Coin creation successful!");
    console.log("- Token address:", address);
    console.log("- Transaction hash:", hash);

    return { address, txHash: hash };
  } catch (error) {
    console.error("Error creating Zora coin:", error);

    // Enhanced error logging
    if (error.cause?.data) {
      console.error("Contract revert data:", error.cause.data);
    }

    if (error.message.includes("0x4ab38e08")) {
      throw new Error(
        "Failed to create token: Name or symbol may be invalid. Try a different title."
      );
    } else if (error.message.includes("user rejected")) {
      throw new Error("Transaction was rejected by user.");
    } else {
      throw new Error(`Failed to create Zora coin: ${error.message}`);
    }
  }
}
