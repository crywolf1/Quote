import { createCoin } from "@zoralabs/coins-sdk";

/**
 * Creates a Zora token with proper validation and error handling
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

    // Generate a guaranteed safe symbol that won't trigger filters
    // Use simple, unambiguous letters and avoid any potentially problematic combinations
    const safeSymbols = ["QUOTE", "TOKEN", "VERSE", "WORDS", "NOTES", "SAYNG"];

    // Generate a random timestamp suffix (1-999) to make the symbol unique
    const timestamp = Date.now() % 1000;

    // Use a completely known-safe symbol pattern
    const symbol = safeSymbols[Math.floor(Math.random() * safeSymbols.length)];

    // Clean the title to be extremely safe
    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special characters
      .trim()
      .substring(0, 30); // Limit length

    // Make a safe token name by adding a distinctive prefix
    const tokenName = `Quote: ${sanitizedTitle}`;

    console.log(`Using symbol: ${symbol} for title: "${tokenName}"`);

    // Upload image to metadata service first
    let metadataUrl;
    try {
      console.log("Creating metadata with image...");
      const metadataRes = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName,
          description: `Quote token created for "${sanitizedTitle}"`,
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

      // Verify metadata URL is accessible before continuing
      console.log("Verifying metadata URL:", metadataUrl);
      const checkRes = await fetch(metadataUrl);
      if (!checkRes.ok) {
        throw new Error(`Metadata URL not accessible: ${checkRes.status}`);
      }

      console.log("Metadata verification successful");
    } catch (metadataError) {
      console.error("Metadata preparation failed:", metadataError);
      throw new Error(`Metadata error: ${metadataError.message}`);
    }

    // Ultra-simplified coin parameters - use hardcoded known-good values
    const coinParams = {
      name: tokenName,
      symbol: symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      // Skip optional parameters entirely
    };

    console.log("Creating Zora coin with params:", coinParams);

    try {
      // Create coin with simplified approach - don't use any extra parameters
      const coinResult = await createCoin(
        {
          name: tokenName,
          symbol: symbol,
          uri: metadataUrl,
          payoutRecipient: creatorAddress,
        },
        walletClient,
        publicClient
      );

      console.log("Coin creation successful!");
      console.log("- Token address:", coinResult.address);
      console.log("- Transaction hash:", coinResult.hash);

      return { address: coinResult.address, txHash: coinResult.hash };
    } catch (contractError) {
      console.error("Contract execution error:", contractError);

      // More informative error messages
      if (contractError.message.includes("0x4ab38e08")) {
        return {
          error:
            "The Zora contract rejected the token creation. This might be a temporary issue - please try again later.",
        };
      } else if (contractError.message.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else if (contractError.message.includes("timeout")) {
        return { error: "Transaction timed out. Please try again later." };
      } else if (contractError.message.includes("insufficient funds")) {
        return {
          error: "Insufficient funds for gas. Please add funds to your wallet.",
        };
      } else {
        return {
          error: `Contract error: ${contractError.message.substring(
            0,
            100
          )}...`,
        };
      }
    }
  } catch (error) {
    console.error("Coin creation process error:", error);
    return { error: error.message };
  }
}
