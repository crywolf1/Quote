import { updateCoinURI } from "@zoralabs/coins-sdk";

/**
 * Updates an existing Zora token's metadata URI with new image and description
 */
export async function updateZoraCoin({
  walletClient,
  publicClient,
  coinAddress,
  title,
  imageUrl,
  description,
}) {
  try {
    // Basic validation
    if (!walletClient || !walletClient.account?.address) {
      console.error("Wallet client validation failed:", { walletClient });
      throw new Error("Wallet client not properly initialized");
    }

    if (!coinAddress) throw new Error("Coin address required");
    if (!title) throw new Error("Title required");
    if (!imageUrl) throw new Error("Image URL required");
    if (!description) throw new Error("Description required");

    console.log("Starting token update process for coin:", coinAddress);
    console.log("New image URL:", imageUrl);
    console.log("New description:", description);

    // Step 1: Create metadata
    console.log("Creating metadata...");
    const metadata = {
      name: title,
      description: `Quote: ${description}`,
      image: imageUrl,
    };

    // Step 2: Upload metadata to get URL - follow same pattern as createZoraCoin.js
    let metadataUrl;
    try {
      console.log("Uploading metadata...");
      const metadataRes = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

      if (!metadataRes.ok) {
        const errorText = await metadataRes.text();
        console.error("Metadata API error:", errorText);
        throw new Error("Failed to create metadata");
      }

      const metadataData = await metadataRes.json();
      console.log("Metadata API response:", metadataData);

      // Check for the URL property
      if (!metadataData.url) {
        console.error("Missing URL in metadata response:", metadataData);
        throw new Error("Metadata response missing URL property");
      }

      metadataUrl = metadataData.url;
      console.log("Metadata created:", metadataUrl);

      // Verify if URL starts with https:// (not ideal) or ipfs:// (preferred)
      if (
        !metadataUrl.startsWith("https://") &&
        !metadataUrl.startsWith("ipfs://")
      ) {
        console.warn(
          "Metadata URL format may not be compatible with Zora:",
          metadataUrl
        );
      }
    } catch (metadataError) {
      console.error("Metadata error:", metadataError);
      throw new Error(`Metadata error: ${metadataError.message}`);
    }

    // Step 3: Use updateCoinURI to update the coin's metadata URI
    console.log("Updating Zora coin URI to:", metadataUrl);

    // These are the params to pass to the SDK's updateCoinURI function
    const updateParams = {
      coin: coinAddress,
      newURI: metadataUrl,
    };

    try {
      console.log("Sending update transaction with params:", updateParams);

      // Add chain ID verification
      const chainId = await publicClient.getChainId();
      console.log("Connected to chain ID:", chainId);

      if (chainId !== 8453) {
        // Base chain ID
        console.error(
          "Warning: Connected to chain ID",
          chainId,
          "but Base chain ID is 8453"
        );
      }

      // Use the SDK's updateCoinURI function to update the metadata
      console.log("Calling Zora SDK updateCoinURI...");
      const result = await updateCoinURI(
        updateParams,
        walletClient,
        publicClient,
        {
          // Don't wait for confirmations to avoid timeouts
          wait: false,
        }
      );

      const hash = result.hash;
      console.log("Update transaction sent successfully! Hash:", hash);

      // Immediately return success with the hash
      const txExplorerUrl = `https://basescan.org/tx/${hash}`;

      console.log("Token update complete, explorer URL:", txExplorerUrl);

      return {
        status: "pending",
        txHash: hash,
        message: "Update submitted! It will be confirmed shortly.",
        explorerUrl: txExplorerUrl,
      };
    } catch (contractError) {
      console.error("Contract update error:", contractError);
      console.error(
        "Full error object:",
        JSON.stringify(contractError, null, 2)
      );

      const errorDetails = contractError.message || "";

      console.log("Error message details:", errorDetails);

      if (errorDetails.includes("OnlyOwner")) {
        console.error("Access denied: Only the coin owner can update");
        return { error: "Only the coin owner can update the metadata." };
      } else if (errorDetails.includes("user rejected")) {
        console.error("Transaction rejected by user");
        return { error: "Transaction was rejected in your wallet." };
      } else if (
        errorDetails.includes("timeout") ||
        errorDetails.includes("timed out")
      ) {
        // Handle timeout errors similar to creation function
        console.log("Transaction timeout - checking for hash in error message");
        const txHashMatch = errorDetails.match(/hash\s*["']([^"']+)["']/i);
        const extractedTxHash = txHashMatch ? txHashMatch[1] : null;

        if (extractedTxHash) {
          console.log(
            "Found transaction hash in error message:",
            extractedTxHash
          );
          const txExplorerUrl = `https://basescan.org/tx/${extractedTxHash}`;
          return {
            status: "pending",
            txHash: extractedTxHash,
            message: "Update submitted but waiting for confirmation.",
            explorerUrl: txExplorerUrl,
          };
        } else {
          console.error("Transaction timed out without hash information");
          return { error: "Transaction timed out. Please try again later." };
        }
      } else if (errorDetails.includes("insufficient funds")) {
        return {
          error:
            "Insufficient funds to complete this transaction. Please check your wallet balance.",
        };
      } else if (errorDetails.includes("nonce too low")) {
        return {
          error:
            "Transaction nonce issue. Please refresh your browser and try again.",
        };
      } else if (errorDetails.includes("gas required exceeds allowance")) {
        return {
          error:
            "Gas limit too low. Please try increasing the gas limit in your wallet.",
        };
      } else {
        console.error("Unhandled contract error");
        return {
          error: "Failed to update token metadata. Please try again later.",
          details: contractError.message || "Unknown error",
        };
      }
    }
  } catch (error) {
    console.error("Coin update process error:", error);
    return {
      error: "Failed to update token metadata",
      details: error.message || "Unknown error occurred",
    };
  }
}
