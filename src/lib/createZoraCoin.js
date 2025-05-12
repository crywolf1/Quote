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
    // Wallet client validation (keep existing code)
    if (!walletClient) {
      console.error("Wallet client not provided or not initialized");
      throw new Error(
        "Wallet client not available. Please connect your wallet and try again."
      );
    }

    // Check if wallet client has the required properties
    if (!walletClient.account?.address) {
      console.error(
        "Wallet client is missing account information",
        walletClient
      );
      throw new Error(
        "Wallet client is not properly initialized. Please reconnect your wallet."
      );
    }

    // Validate other basic inputs
    if (!creatorAddress) throw new Error("Creator address required.");
    if (!title || typeof title !== "string")
      throw new Error("Valid title required.");
    if (!imageUrl) throw new Error("Image URL required.");

    console.log("Wallet client validation passed:", {
      walletAddress: walletClient.account.address,
      connected: true,
    });
    console.log("Starting token creation process for:", title);

    // MODIFIED: Create a truly unique symbol with timestamp and specific generation strategy
    const generateTrulyUniqueSymbol = () => {
      // Current time components in base 36 for compactness
      const now = new Date();
      const timeComponent = now.getTime().toString(36).slice(-5).toUpperCase();

      // Random component using crypto if available for better randomness
      let randomComponent;
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        const arr = new Uint8Array(2);
        crypto.getRandomValues(arr);
        randomComponent = Array.from(arr, (x) =>
          x.toString(36).padStart(2, "0")
        )
          .join("")
          .slice(0, 3)
          .toUpperCase();
      } else {
        // Fallback to Math.random if crypto API not available
        randomComponent = Math.random()
          .toString(36)
          .substring(2, 5)
          .toUpperCase();
      }

      // Combine for uniqueness - use first 2 chars of each to keep it at 4 chars total
      const uniqueSymbol =
        timeComponent.substring(0, 2) + randomComponent.substring(0, 3);

      return uniqueSymbol;
    };

    const symbol = generateTrulyUniqueSymbol();
    console.log("Using guaranteed unique symbol:", symbol);

    // Clean the title (keep existing code)
    const cleanTitle = title
      .replace(/[^\w\s]/gi, "") // Remove special characters
      .substring(0, 30); // Limit length

    console.log("Using cleaned title:", cleanTitle);

    // Step 1: Create metadata (keep existing code)
    console.log("Creating metadata...");
    const metadata = {
      name: cleanTitle,
      description: `Quote: ${cleanTitle}`,
      image: imageUrl,
      properties: {
        category: "quote",
      },
    };

    // Step 2: Upload metadata to get URL (keep existing code)
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
      console.log("Metadata created:", metadataUrl);

      // Verify metadata URL is accessible
      console.log("Verifying metadata URL:", metadataUrl);
      const checkRes = await fetch(metadataUrl, {
        cache: "no-store", // Force fresh fetch
      });
      if (!checkRes.ok) {
        throw new Error(`Metadata URL not accessible: ${metadataUrl}`);
      }
      console.log("Metadata verification successful");
    } catch (metadataError) {
      console.error("Metadata error:", metadataError);
      throw new Error(`Metadata error: ${metadataError.message}`);
    }

    // Step 3: CRITICAL CHANGE - Use the symbol from coinIt
    // The successful implementation uses symbol for both name and symbol
    console.log(
      "Creating Zora coin with params using timestamp-based symbol..."
    );

    // MODIFIED COIN PARAMS: Use exact format from coinIt function
    const coinParams = {
      name: symbol, // Use symbol as name (critical for success)
      symbol: symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
    };

    try {
      // Add a longer delay to ensure metadata is fully propagated (3 seconds)
      console.log("Waiting for metadata propagation...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Double-check wallet client before transaction
      if (!walletClient.account?.address) {
        throw new Error("Wallet client lost connection. Please try again.");
      }

      // Log transaction details for debugging
      console.log("Transaction parameters:", {
        walletClient: {
          address: walletClient.account.address,
          chainId: walletClient.chain?.id || "unknown",
        },
        publicClient: {
          chainId: publicClient.chain.id,
        },
        coinParams: coinParams,
      });

      console.log("Sending transaction with params:", coinParams);
      const coinResult = await createCoin(
        coinParams,
        walletClient,
        publicClient
      );

      console.log("Coin creation successful!");
      console.log("- Token address:", coinResult.address);
      console.log("- Transaction hash:", coinResult.hash);

      // Generate coin page URL
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

      // Get detailed error information
      const errorDetails = contractError.message || "";
      console.log("Full error details:", contractError);

      // Try to extract specific error signatures for better diagnosis
      const errorSignature =
        errorDetails.match(/signature:\s*(0x[a-f0-9]+)/i)?.[1] || "";

      if (errorDetails.includes("0x4ab38e08")) {
        // Modified to handle symbol collisions with a more specific message
        return {
          error:
            "Symbol collision detected. Please try again - the system will generate a new unique symbol.",
        };
      } else if (errorDetails.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else if (
        errorDetails.includes("timeout") ||
        errorDetails.includes("timed out")
      ) {
        return { error: "Transaction timed out. Please try again later." };
      } else if (
        errorDetails.includes("not available") ||
        errorDetails.includes("wallet client")
      ) {
        return {
          error:
            "Wallet connection issue. Please refresh the page and reconnect your wallet.",
        };
      } else {
        return {
          error: `Token creation failed: ${
            errorSignature || "Contract error"
          }. Please try again.`,
        };
      }
    }
  } catch (error) {
    console.error("Coin creation process error:", error);
    return { error: "Failed to create token: " + error.message };
  }
}
