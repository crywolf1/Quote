import { createCoin } from "@zoralabs/coins-sdk";

/**
 * Creates a Zora token with proper validation and error handling
 * Mimics the Zora.co posting flow that automatically creates coins
 */
export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // Validate basic inputs
    if (!walletClient) throw new Error("Wallet client not provided.");
    if (!creatorAddress) throw new Error("Creator address required.");
    if (!title || typeof title !== "string")
      throw new Error("Valid title required.");
    if (!imageUrl) throw new Error("Image URL required.");

    // Generate deterministic safe symbols based on the title
    // This approach creates consistency in how symbols are generated
    const baseSafeSymbols = ["QT", "TK", "VR", "QO"];

    // Create a hash of the title to get a consistent number
    const titleHash = title.split("").reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    // Use the hash to select a base symbol
    const baseSymbol = baseSafeSymbols[titleHash % baseSafeSymbols.length];

    // Add a numeric suffix from the hash for uniqueness
    const numericSuffix = (titleHash % 100).toString().padStart(2, "0");
    const symbol = `${baseSymbol}${numericSuffix}`;

    // Clean the title to be safe but preserve meaning
    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special characters
      .trim()
      .substring(0, 30); // Limit length

    // Use a simple token name format that keeps original meaning
    const tokenName = sanitizedTitle;

    console.log(
      `Creating token with symbol: ${symbol} for title: "${tokenName}"`
    );

    // Step 1: Prepare metadata (like Zora's first step)
    console.log("Step 1: Preparing metadata...");
    let metadataUrl;
    try {
      const metadataRes = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName,
          description: `Quote: ${sanitizedTitle}`,
          image: imageUrl,
          attributes: [
            { trait_type: "Type", value: "Quote" },
            { trait_type: "Created", value: new Date().toISOString() },
          ],
        }),
      });

      if (!metadataRes.ok) {
        const errorData = await metadataRes.json();
        throw new Error(errorData.error || "Failed to create metadata");
      }

      const metadataData = await metadataRes.json();
      metadataUrl = metadataData.url;

      console.log("Metadata created successfully:", metadataUrl);
    } catch (metadataError) {
      console.error("Metadata preparation failed:", metadataError);
      throw new Error(`Metadata creation failed: ${metadataError.message}`);
    }

    // Step 2: Create the coin parameters (like Zora's final step)
    console.log("Step 2: Preparing coin parameters...");

    // Use minimal parameters, similar to what Zora likely uses
    const coinParams = {
      name: tokenName,
      symbol: symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
    };

    // Step 3: Create the coin
    console.log("Step 3: Creating coin with Zora SDK...");
    try {
      // No extra parameters, just the basics
      const coinResult = await createCoin(
        coinParams,
        walletClient,
        publicClient
      );

      console.log("Coin creation successful!");
      console.log("- Token address:", coinResult.address);
      console.log("- Transaction hash:", coinResult.hash);

      return { address: coinResult.address, txHash: coinResult.hash };
    } catch (contractError) {
      console.error("Contract execution error:", contractError);

      // Extract useful information from the error
      const errorDetails = contractError.message || "";
      const errorSignature =
        errorDetails.match(/signature:\s*(0x[a-f0-9]+)/i)?.[1] || "";

      // Handle known error cases with user-friendly messages
      if (errorDetails.includes("0x4ab38e08")) {
        // This specific error often relates to name/symbol issues
        return {
          error:
            "Unable to create token with this name. Please try a different title.",
        };
      } else if (errorDetails.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else if (
        errorDetails.includes("timeout") ||
        errorDetails.includes("timed out")
      ) {
        return { error: "Transaction timed out. Please try again later." };
      } else if (
        errorDetails.includes("insufficient funds") ||
        errorDetails.includes("gas")
      ) {
        return {
          error: "Insufficient funds for gas. Please add funds to your wallet.",
        };
      } else {
        // For unknown errors, provide the error signature for debugging
        return {
          error: `Token creation failed. ${
            errorSignature
              ? `(Error code: ${errorSignature})`
              : "Please try again later."
          }`,
        };
      }
    }
  } catch (error) {
    console.error("Coin creation process error:", error);
    return { error: "Failed to create token: " + error.message };
  }
}
