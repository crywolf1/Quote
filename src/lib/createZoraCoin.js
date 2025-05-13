import { createCoin } from "@zoralabs/coins-sdk";

/**
 * Creates a Zora token with proper validation and error handling
 * Based on successful implementation patterns and Zora developer recommendations
 */
export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // Wallet client validation
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

    console.log("Starting token creation process for:", title);

    // Generate a special format symbol that is guaranteed unique
    // but does not affect the display title
    const generateZoraCompatibleSymbol = () => {
      // Use only uppercase letters A-Z (excluding I and O which can be confused with numbers)
      const safeLetters = "ABCDEFGHJKLMNPQRSTUVWXYZ";

      // Create a 5-character symbol
      let result = "";

      // First char: always use Z for Zora
      result += "Z";

      // Add 2 random letters
      for (let i = 0; i < 2; i++) {
        result += safeLetters.charAt(
          Math.floor(Math.random() * safeLetters.length)
        );
      }

      // Add 2 digits for extra uniqueness
      const timestamp = Date.now().toString();
      result += timestamp.substring(timestamp.length - 2);

      return result;
    };

    const symbol = generateZoraCompatibleSymbol();
    console.log("Using Zora-compatible symbol:", symbol);

    // Step 1: Create metadata with proper title
    console.log("Creating metadata...");
    const metadata = {
      name: title,
      description: `Quote: ${title}`,
      image: imageUrl,
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

    // Step 3: Use the correct parameters as recommended by Zora developer
    console.log("Creating Zora coin with developer-recommended parameters...");

    // Add the tickLower parameter as recommended by Zora developer
    const coinParams = {
      // For contract purposes we use the symbol as name, but the title is preserved in metadata
      name: symbol,
      symbol: symbol,
      uri: metadataUrl, // This contains the actual title in the metadata
      payoutRecipient: creatorAddress,
      // Add currency parameter for Base (ETH on Base)
      currency: "0x4200000000000000000000000000000000000006", // ETH on Base
      // Add tickLower parameter per Zora developer recommendation
      tickLower: -208200,
      // Add empty platform referrer (this is important for proper contract execution)
      platformReferrer: "0x0000000000000000000000000000000000000000",
    };

    try {
      // Add a longer delay to ensure metadata is fully propagated
      console.log("Waiting for metadata propagation...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Double-check wallet client before transaction
      if (!walletClient.account?.address) {
        throw new Error("Wallet client lost connection. Please try again.");
      }

      console.log("Sending transaction with params:", coinParams);

      // Send transaction with retry logic and improved timeout handling
      let attempt = 1;
      const maxAttempts = 2;
      let coinResult;
      let lastError;

      while (attempt <= maxAttempts) {
        try {
          console.log(`Attempt ${attempt} of ${maxAttempts}...`);
          // Increase timeout for transaction confirmation
          coinResult = await createCoin(
            coinParams,
            walletClient,
            publicClient,
            {
              confirmations: 1, // Only wait for 1 confirmation
              timeout: 120000, // 2 minute timeout (up from default)
            }
          );
          break; // Success, exit the loop
        } catch (err) {
          lastError = err;
          if (err.message && err.message.includes("0x4ab38e08")) {
            // Symbol collision, regenerate symbol and try again
            if (attempt < maxAttempts) {
              const newSymbol = generateZoraCompatibleSymbol();
              console.log(
                `Symbol collision detected. Trying again with: ${newSymbol}`
              );

              // Update parameters with new symbol
              coinParams.name = newSymbol;
              coinParams.symbol = newSymbol;

              attempt++;
              await new Promise((r) => setTimeout(r, 1000)); // Wait before retry
            } else {
              throw err; // Max attempts reached, propagate error
            }
          } else {
            throw err; // Different error, propagate it
          }
        }
      }

      if (!coinResult) {
        throw (
          lastError ||
          new Error("Failed to create coin after multiple attempts")
        );
      }

      console.log("Coin creation successful!");
      console.log("- Token address:", coinResult.address);
      console.log("- Transaction hash:", coinResult.hash);

      // Generate coin page URL
      const coinAddress = coinResult.address;
      const coinPage = `https://zora.co/coin/base:${coinAddress?.toLowerCase()}`;

      return {
        address: coinResult.address,
        txHash: coinResult.hash,
        symbol: coinParams.symbol, // Return the final symbol used
        coinPage: coinPage,
      };
    } catch (contractError) {
      console.error("Contract execution error:", contractError);

      // Get detailed error information
      const errorDetails = contractError.message || "";
      console.log("Full error details:", contractError);

      // Look for the transaction hash in timeout errors
      const txHashMatch = errorDetails.match(/hash\s*["']([^"']+)["']/i);
      const extractedTxHash = txHashMatch ? txHashMatch[1] : null;

      // Try to extract specific error signatures for better diagnosis
      const errorSignature =
        errorDetails.match(/signature:\s*(0x[a-f0-9]+)/i)?.[1] || "";

      if (errorDetails.includes("0x4ab38e08")) {
        return {
          error:
            "Symbol already exists in Zora. Please try again with a new quote.",
        };
      } else if (errorDetails.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else if (
        errorDetails.includes("timeout") ||
        errorDetails.includes("timed out")
      ) {
        // Special handling for timeout errors that have transaction hashes
        if (extractedTxHash) {
          // Transaction was submitted but confirmation is taking time
          const txExplorerUrl = `https://basescan.org/tx/${extractedTxHash}`;

          return {
            status: "pending",
            txHash: extractedTxHash,
            message:
              "Transaction submitted but waiting for confirmation. This is normal on busy networks.",
            explorerUrl: txExplorerUrl,
            error:
              "Your token is being created, but confirmation is taking longer than expected. You can check its status on BaseScan.",
          };
        } else {
          return { error: "Transaction timed out. Please try again later." };
        }
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
