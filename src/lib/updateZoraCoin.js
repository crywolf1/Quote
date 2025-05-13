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

    // Step 1: Create updated metadata
    console.log("Creating updated metadata...");
    const metadata = {
      name: title,
      description: `Quote: ${description}`,
      image: imageUrl,
    };

    // Step 2: Upload metadata to get URL
    let metadataUrl;
    try {
      console.log("Uploading updated metadata...");
      const metadataRes = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

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
      if (!metadataData || !metadataData.url) {
        console.error("Invalid metadata API response:", metadataData);
        throw new Error("Metadata API response missing URL property");
      }

      metadataUrl = metadataData.url;
      console.log("Updated metadata created:", metadataUrl);

      // Verify the URL meets Zora requirements
      if (
        !metadataUrl.startsWith("ipfs://") &&
        !metadataUrl.startsWith("https://")
      ) {
        console.warn(
          "Warning: Metadata URL should ideally start with ipfs:// for best practices"
        );
        // We'll continue anyway, but log a warning
      }
    } catch (metadataError) {
      console.error("Metadata update error:", metadataError);
      throw new Error(`Metadata update error: ${metadataError.message}`);
    }

    // Step 3: Use updateCoinURI to update the coin's metadata URI
    console.log("Updating Zora coin URI...");

    // These are the params to pass to the SDK's updateCoinURI function
    const updateParams = {
      coin: coinAddress,
      newURI: metadataUrl,
    };

    try {
      console.log("Sending update transaction with params:", updateParams);

      // Use the SDK's updateCoinURI function to update the metadata
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

      return {
        status: "pending",
        txHash: hash,
        message: "Update submitted! It will be confirmed shortly.",
        explorerUrl: txExplorerUrl,
      };
    } catch (contractError) {
      console.error("Contract update error:", contractError);

      const errorDetails = contractError.message || "";

      if (errorDetails.includes("OnlyOwner")) {
        return { error: "Only the coin owner can update the metadata." };
      } else if (errorDetails.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else if (
        errorDetails.includes("timeout") ||
        errorDetails.includes("timed out")
      ) {
        // Handle timeout errors similar to creation function
        const txHashMatch = errorDetails.match(/hash\s*["']([^"']+)["']/i);
        const extractedTxHash = txHashMatch ? txHashMatch[1] : null;

        if (extractedTxHash) {
          const txExplorerUrl = `https://basescan.org/tx/${extractedTxHash}`;
          return {
            status: "pending",
            txHash: extractedTxHash,
            message: "Update submitted but waiting for confirmation.",
            explorerUrl: txExplorerUrl,
          };
        } else {
          return { error: "Transaction timed out. Please try again later." };
        }
      } else {
        return { error: contractError.message || "Contract error occurred" };
      }
    }
  } catch (error) {
    console.error("Coin update process error:", error);
    return { error: error.message || "Failed to update token" };
  }
}
