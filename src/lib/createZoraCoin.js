import { createCoin } from "@zoralabs/coins-sdk";

/**
 * Creates a Zora token with proper validation and error handling
 * Based on successful implementation patterns from flipp.lol and cast-to-coin apps
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

    console.log("Starting token creation process for:", title);

    // Generate symbol from title (similar to ExtractSymbolFromText function)
    // Key insight: Use simplified symbols that mimic what Google Gemini would generate
    let symbol = title
      .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special characters
      .split(/\s+/) // Split by whitespace
      .filter((word) => word.length > 0) // Remove empty strings
      .map((word) => word.toUpperCase()) // Make uppercase
      .join("") // Join them
      .substring(0, 5); // Limit to 5 characters

    // Ensure symbol is at least 3 characters
    if (symbol.length < 3) {
      const safeDefaults = ["QOT", "TKN", "QUOT"];
      symbol = safeDefaults[0];
    }

    // Ensure symbol is not too long (keep it to 5 chars max for Zora compatibility)
    if (symbol.length > 5) {
      symbol = symbol.substring(0, 5);
    }

    // Add uniqueness with uuid-like suffix if needed (important for preventing collisions)
    const randomSuffix = Math.floor(Math.random() * 10).toString();

    // Final symbol format: keep it short and unique
    // Use exactly 4-5 chars which works reliably with Zora
    if (symbol.length <= 3) {
      symbol = symbol + randomSuffix;
    } else {
      // For longer symbols, truncate to keep total length at 5 chars
      symbol = symbol.substring(0, 4) + randomSuffix;
    }

    console.log("Using symbol:", symbol);

    // Step 1: Create metadata (similar to the example metadata structure)
    console.log("Creating metadata JSON...");
    const metadata = {
      name: title,
      description: `Quote token: ${title}`,
      symbol: symbol,
      image: imageUrl,
      properties: {
        category: "quote",
      },
    };

    // Step 2: Upload metadata to get URL
    let metadataUrl;
    try {
      console.log("Uploading metadata...");
      const metadataRes = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

      if (!metadataRes.ok) {
        const errorData = await metadataRes.json();
        throw new Error(errorData.error || "Failed to create metadata");
      }

      const metadataData = await metadataRes.json();
      metadataUrl = metadataData.url;
      console.log("Metadata created successfully:", metadataUrl);

      // Verify metadata is accessible (important for contract success)
      console.log("Verifying metadata URL...");
      const checkRes = await fetch(metadataUrl);
      if (!checkRes.ok) {
        throw new Error(`Metadata URL not accessible: ${metadataUrl}`);
      }
    } catch (metadataError) {
      console.error("Metadata error:", metadataError);
      throw new Error(`Metadata error: ${metadataError.message}`);
    }

    // Step 3: Create coin with parameters matching the successful implementation
    console.log("Creating Zora coin...");

    // Notice in the coinIt function they use minimal parameters and the
    // same symbol for both name and symbol properties
    const coinParams = {
      name: title,
      symbol: symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      // Optional parameter from the example code
      platformReferrer:
        process.env.PLATFORM_REFERRER ||
        "0x0000000000000000000000000000000000000000",
    };

    try {
      console.log("Sending transaction with params:", coinParams);
      const coinResult = await createCoin(
        coinParams,
        walletClient,
        publicClient
      );

      console.log("Coin creation successful!");
      console.log("- Token address:", coinResult.address);
      console.log("- Transaction hash:", coinResult.hash);

      // Generate coin page URL like in the example
      const coinAddress = coinResult.address;
      const coinPage = `https://zora.co/coin/base:${coinAddress?.toLowerCase()}`;

      return {
        address: coinResult.address,
        txHash: coinResult.hash,
        symbol: symbol,
        coinPage: coinPage,
      };
    } catch (contractError) {
      console.error("Contract execution error:", contractError);

      // Extract useful information from the error
      const errorDetails = contractError.message || "";
      const errorSignature =
        errorDetails.match(/signature:\s*(0x[a-f0-9]+)/i)?.[1] || "";

      // Handle known error cases with user-friendly messages (similar to example code)
      if (errorDetails.includes("0x4ab38e08")) {
        return {
          error:
            "This symbol is already taken. Please try again with a different title.",
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
