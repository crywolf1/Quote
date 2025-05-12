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

    // Create a clean symbol (3-6 chars recommended by Zora)
    // Use only uppercase alphanumeric with strict validation
    const rawSymbol = title.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Always ensure 3-6 characters for symbol (Zora recommended length)
    let symbol;
    if (rawSymbol.length >= 3 && rawSymbol.length <= 6) {
      symbol = rawSymbol;
    } else if (rawSymbol.length < 3) {
      // If too short, pad with random characters
      const padding = "XYZ";
      symbol = (rawSymbol + padding).substring(0, 3);
    } else {
      // If too long, truncate to 6 characters
      symbol = rawSymbol.substring(0, 6);
    }

    // Check for reserved words and common token names to avoid collisions
    const reservedSymbols = [
      "ETH",
      "BTC",
      "WETH",
      "USD",
      "USDC",
      "USDT",
      "DAI",
      "COIN",
    ];
    if (reservedSymbols.includes(symbol)) {
      symbol = symbol.substring(0, 2) + "Q";
    }

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

    // Simplified coin parameters - only use what's absolutely required
    // This minimizes the chance of validation errors
    const coinParams = {
      name: title,
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

      if (contractError.message.includes("0x4ab38e08")) {
        // Common error - try to provide helpful guidance
        return {
          error:
            "Symbol/name validation failed - please try a different title with only letters and numbers.",
        };
      } else if (contractError.message.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else {
        return { error: `Contract error: ${contractError.message}` };
      }
    }
  } catch (error) {
    console.error("Coin creation process error:", error);
    return { error: error.message };
  }
}
