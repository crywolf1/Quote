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
    // Basic validation with more detailed error messages
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
    console.log("Using wallet address:", walletClient.account.address);

    // Step 1: Create updated metadata
    console.log("Creating updated metadata...");
    const metadata = {
      name: title,
      description: `Quote: ${description}`,
      image: imageUrl,
    };

    // Step 2: Upload metadata to get URL - we need an IPFS URL
    let metadataUrl;
    try {
      console.log("Uploading updated metadata to get IPFS URL...");

      // We need to call our API to get an IPFS URL, not just a Cloudinary URL
      const metadataRes = await fetch("/api/ipfs-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

      console.log("Metadata API status:", metadataRes.status);

      if (!metadataRes.ok) {
        const errorText = await metadataRes.text();
        console.error("Metadata API error:", {
          status: metadataRes.status,
          body: errorText,
        });
        throw new Error(
          `Failed to create updated metadata: ${metadataRes.status} ${errorText}`
        );
      }

      // Parse the metadata response
      const responseText = await metadataRes.text();
      console.log("Raw metadata API response:", responseText);

      let metadataData;
      try {
        metadataData = JSON.parse(responseText);
        console.log("Parsed metadata API response:", metadataData);
      } catch (parseError) {
        console.error(
          "JSON parse error for metadata:",
          parseError,
          "Response:",
          responseText
        );
        throw new Error(
          `Invalid JSON from metadata API: ${parseError.message}`
        );
      }
      // Ensure we have a proper URL from the metadata endpoint
      if (!metadataData || !metadataData.ipfsUrl) {
        console.error("Invalid metadata API response:", metadataData);
        throw new Error("Metadata API response missing ipfsUrl property");
      }

      metadataUrl = metadataData.ipfsUrl;
      console.log("Updated metadata created with IPFS URL:", metadataUrl);

      // CRITICAL: Verify the URL meets Zora requirements - MUST start with ipfs://
      if (!metadataUrl.startsWith("ipfs://")) {
        console.error("Invalid metadata URL format for Zora:", metadataUrl);
        throw new Error("Metadata URL must start with ipfs:// for Zora tokens");
      }
    } catch (metadataError) {
      console.error("Metadata update error:", metadataError);
      throw new Error(`Metadata update error: ${metadataError.message}`);
    }

    // Step 3: Use updateCoinURI to update the coin's metadata URI
    console.log("Updating Zora coin URI to:", metadataUrl);

    // These are the params to pass to the SDK's updateCoinURI function
    const updateParams = {
      coin: coinAddress,
      newURI: metadataUrl, // This MUST be an ipfs:// URL
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
      } else if (errorDetails.includes("already known")) {
        // Transaction is already in the mempool
        const txHashMatch = errorDetails.match(/hash\s*["']([^"']+)["']/i);
        const extractedTxHash = txHashMatch ? txHashMatch[1] : null;

        if (extractedTxHash) {
          const txExplorerUrl = `https://basescan.org/tx/${extractedTxHash}`;
          return {
            status: "pending",
            txHash: extractedTxHash,
            message: "Transaction already submitted, waiting for confirmation.",
            explorerUrl: txExplorerUrl,
          };
        }
        return {
          error:
            "Transaction is already pending. Please wait for it to complete.",
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
