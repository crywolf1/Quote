import { createCoin } from "@zoralabs/coins-sdk";

/**
 * Creates a Zora token using the SDK with minimal required parameters
 */
export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // Basic validation
    if (!walletClient || !walletClient.account?.address) {
      throw new Error("Wallet client not properly initialized");
    }

    if (!creatorAddress) throw new Error("Creator address required");
    if (!title) throw new Error("Title required");
    if (!imageUrl) throw new Error("Image URL required");

    console.log("Starting token creation process for:", title);

    // Step 1: Create metadata
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
        throw new Error("Failed to create metadata");
      }

      const metadataData = await metadataRes.json();
      metadataUrl = metadataData.url;
      console.log("Metadata created:", metadataUrl);
    } catch (metadataError) {
      console.error("Metadata error:", metadataError);
      throw new Error(`Metadata error: ${metadataError.message}`);
    }

    // Step 3: Create coin with minimal required parameters
    console.log("Creating Zora coin with minimal parameters...");

    // These are the params to pass to the SDK's createCoin function
    const coinParams = {
      name: title, // Using title directly for name
      symbol: title, // Using title directly for symbol
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      // Use the recommended tickLower value from Zora dev
      tickLower: -208200,
    };

    try {
      console.log("Sending transaction with params:", coinParams);

      // Use the SDK's createCoin function to get a transaction hash
      const result = await createCoin(coinParams, walletClient, publicClient, {
        // Don't wait for confirmations to avoid timeouts
        wait: false,
      });

      const hash = result.hash;
      console.log("Transaction sent successfully! Hash:", hash);

      // Immediately return success with the hash
      const txExplorerUrl = `https://basescan.org/tx/${hash}`;

      return {
        status: "pending",
        txHash: hash,
        message: "Transaction submitted! It will be confirmed shortly.",
        explorerUrl: txExplorerUrl,
      };
    } catch (contractError) {
      console.error("Contract execution error:", contractError);

      const errorDetails = contractError.message || "";

      if (errorDetails.includes("0x4ab38e08")) {
        return { error: "Symbol already exists. Please try again." };
      } else if (errorDetails.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else {
        return { error: contractError.message || "Contract error occurred" };
      }
    }
  } catch (error) {
    console.error("Coin creation process error:", error);
    return { error: error.message || "Failed to create token" };
  }
}
