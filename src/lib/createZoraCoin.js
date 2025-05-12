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
    // More robust wallet client validation
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

    // Generate a safer symbol - using a different pattern
    // This pattern mirrors the coinIt function from your example code
    const generateUniqueSymbol = () => {
      // Use only letters for simplicity
      const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed confusing letters I,O
      let symbol = "";

      // Generate 5 random uppercase letters (exactly 5 chars)
      for (let i = 0; i < 5; i++) {
        symbol += letters.charAt(Math.floor(Math.random() * letters.length));
      }

      return symbol;
    };

    const symbol = generateUniqueSymbol();
    console.log("Using symbol:", symbol);

    // Clean the title to be absolutely safe
    const cleanTitle = title
      .replace(/[^\w\s]/gi, "") // Remove special characters
      .substring(0, 30); // Limit length

    console.log("Using cleaned title:", cleanTitle);

    // Step 1: Create metadata with minimal structure
    // The successful implementation uses a very simple metadata structure
    console.log("Creating metadata...");
    const metadata = {
      name: cleanTitle,
      description: `Quote: ${cleanTitle}`,
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

    // Step 3: Create coin with absolute minimal parameters
    console.log("Creating Zora coin...");

    // Use the exact structure from the successful coinIt function
    // Note the symbol is used as both name and symbol in the coinIt function
    const coinParams = {
      name: symbol, // Use symbol as name like in the coinIt function
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
        return {
          error: "Symbol already exists. Please try again.",
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
