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

    // Generate a simple random symbol - keep it extremely basic
    // Using a fixed prefix followed by random characters works most reliably
    const generateUniqueSymbol = () => {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const prefix = "ZZ"; // Fixed prefix
      let random = "";

      // Generate 3 random uppercase letters
      for (let i = 0; i < 3; i++) {
        random += letters.charAt(Math.floor(Math.random() * letters.length));
      }

      return prefix + random;
    };

    const symbol = generateUniqueSymbol();
    console.log("Using symbol:", symbol);

    // Step 1: Create metadata with minimal structure
    // The successful implementation uses a very simple metadata structure
    console.log("Creating metadata...");
    const metadata = {
      name: title,
      description: title, // Use the same value for both name and description
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
      console.log("Metadata created:", metadataUrl);

      // Verify metadata URL is accessible
      const checkRes = await fetch(metadataUrl);
      if (!checkRes.ok) {
        throw new Error(`Metadata URL not accessible: ${metadataUrl}`);
      }
    } catch (metadataError) {
      console.error("Metadata error:", metadataError);
      throw new Error(`Metadata error: ${metadataError.message}`);
    }

    // Step 3: Create coin with absolute minimal parameters
    // The key insight from the successful implementation is to use minimal parameters
    console.log("Creating Zora coin...");

    // Use extremely minimal parameters like the successful implementation
    const coinParams = {
      name: title,
      symbol: symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      // No additional parameters - this is the key difference
    };

    try {
      // Add a small delay to ensure metadata is fully propagated
      await new Promise((resolve) => setTimeout(resolve, 1000));

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

      // Handle errors with more specific messaging
      const errorDetails = contractError.message || "";

      if (errorDetails.includes("0x4ab38e08")) {
        // Try to extract more details from the error for better diagnosis
        console.log("Full error details:", contractError);

        return {
          error:
            "Token creation failed. Please try again with a different title.",
        };
      } else if (errorDetails.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else if (
        errorDetails.includes("timeout") ||
        errorDetails.includes("timed out")
      ) {
        return { error: "Transaction timed out. Please try again later." };
      } else {
        return {
          error:
            "Token creation failed. This could be due to network conditions or contract restrictions.",
        };
      }
    }
  } catch (error) {
    console.error("Coin creation process error:", error);
    return { error: "Failed to create token: " + error.message };
  }
}
