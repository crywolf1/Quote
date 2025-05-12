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

    // Create a clean symbol using safer approach
    // Only use A-Z characters to avoid potential inappropriate combinations
    const rawSymbol = title.toUpperCase().replace(/[^A-Z]/g, ""); // Remove numbers and special chars for safety

    // Create safer symbol (4-5 chars is ideal)
    let symbol;
    if (rawSymbol.length >= 4 && rawSymbol.length <= 5) {
      symbol = rawSymbol;
    } else if (rawSymbol.length < 4) {
      // If too short, pad with safe characters
      const safePadding = "ABCD";
      symbol = (rawSymbol + safePadding).substring(0, 4);
    } else {
      // If too long, truncate to 5 characters
      symbol = rawSymbol.substring(0, 5);
    }

    // Safe words to use as prefixes for symbol generation
    const safeWords = ["TOKN", "QUOT", "WORD", "TEXT", "VERS"];

    // Always add a safe prefix if original symbol is too short or potentially problematic
    if (rawSymbol.length < 3 || symbol.length < 4) {
      const randomPrefix =
        safeWords[Math.floor(Math.random() * safeWords.length)];
      symbol = randomPrefix;
    }

    // Avoid reserved names and add randomization to prevent collisions
    const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    symbol = symbol + randomChar;

    // Keep symbol within 5 characters for optimal compatibility
    symbol = symbol.substring(0, 5);

    console.log(`Using symbol: ${symbol} for title: ${title}`);

    // Upload image to metadata service first
    let metadataUrl;
    try {
      console.log("Creating metadata with image...");
      const metadataRes = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title,
          description: `Quote token: ${title}`,
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

      // Parse the metadata to ensure it's valid JSON
      const metadata = await checkRes.json();
      if (!metadata.name || !metadata.image) {
        throw new Error("Metadata is missing required fields");
      }

      console.log("Metadata verification successful");
    } catch (metadataError) {
      console.error("Metadata preparation failed:", metadataError);
      throw new Error(`Metadata error: ${metadataError.message}`);
    }

    // Simplified coin parameters with consistent safe naming pattern
    const coinParams = {
      name: `${title} Quote`, // Make name more distinctive
      symbol: symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
    };

    console.log("Creating Zora coin with params:", coinParams);

    try {
      // Use a timeout to ensure proper async handling
      const coinResult = await Promise.race([
        createCoin(coinParams, walletClient, publicClient),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Coin creation timeout")), 60000)
        ),
      ]);

      console.log("Coin creation successful!");
      console.log("- Token address:", coinResult.address);
      console.log("- Transaction hash:", coinResult.hash);

      return { address: coinResult.address, txHash: coinResult.hash };
    } catch (contractError) {
      console.error("Contract execution error:", contractError);

      // Detailed error handling based on specific error signatures
      if (contractError.message.includes("0x4ab38e08")) {
        return {
          error: "Token naming issue. Please try again with a different title.",
        };
      } else if (contractError.message.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else if (contractError.message.includes("timeout")) {
        return { error: "Transaction timed out. Please try again later." };
      } else {
        return {
          error: `Contract error: Please try again with a different title.`,
        };
      }
    }
  } catch (error) {
    console.error("Coin creation process error:", error);
    return { error: error.message };
  }
}
