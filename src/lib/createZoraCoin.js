import { createCoin, getCoinCreateFromLogs } from "@zoralabs/coins-sdk";
import { createSplitContract } from "./createSplitContract";

/**
 * Creates a Zora token using the SDK with revenue sharing
 */
export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
  quoteId,
  enableSplit = true, // Default to true to always enable splits
}) {
  try {
    // Basic validation
    if (!walletClient || !walletClient.account?.address) {
      throw new Error("Wallet client not properly initialized");
    }

    if (!creatorAddress) throw new Error("Creator address required");
    if (!title) throw new Error("Title required");
    if (!imageUrl) throw new Error("Image URL required");
    if (!quoteId) throw new Error("Quote ID required");

    console.log("Starting token creation process for:", title);
    console.log("Creating token for quote ID:", quoteId);

    // Create split contract first for revenue sharing if enabled
    let payoutRecipient = creatorAddress;
    let splitContractInfo = null;

    if (enableSplit) {
      try {
        console.log("Creating split contract for revenue sharing...");
        splitContractInfo = await createSplitContract({
          walletClient,
          creatorAddress,
        });

        // Use the split contract address as payment recipient
        payoutRecipient = splitContractInfo.splitAddress;
        console.log(
          `Using split contract ${payoutRecipient} for payments distribution`
        );
      } catch (splitError) {
        console.error("Failed to create split contract:", splitError);
        console.log("Falling back to creator address only for payments");
      }
    }

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

    // Step 3: Create coin with parameters
    console.log("Creating Zora coin with parameters...");

    // These are the params to pass to the SDK's createCoin function
    const coinParams = {
      name: title,
      symbol: title,
      uri: metadataUrl,
      payoutRecipient: payoutRecipient, // Using either split contract or creator directly
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

      // Start tracking transaction for coin address extraction
      waitForTransactionAndUpdateQuote(
        publicClient,
        hash,
        quoteId,
        metadataUrl,
        splitContractInfo
      );

      // Return success with the hash and split info if applicable
      const txExplorerUrl = `https://basescan.org/tx/${hash}`;

      return {
        status: "pending",
        txHash: hash,
        message: "Transaction submitted! It will be confirmed shortly.",
        explorerUrl: txExplorerUrl,
        splitInfo: splitContractInfo,
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

/**
 * Wait for transaction confirmation and update quote with token address
 */
async function waitForTransactionAndUpdateQuote(
  publicClient,
  txHash,
  quoteId,
  metadataUrl,
  splitContractInfo
) {
  try {
    console.log("Waiting for transaction confirmation:", txHash);
    console.log("Will update quote ID after confirmation:", quoteId);

    // Wait for the transaction to be mined
    // We use setTimeout instead of await to avoid blocking
    setTimeout(async () => {
      try {
        // Check transaction receipt after a delay
        const receipt = await publicClient.getTransactionReceipt({
          hash: txHash,
        });

        console.log("Transaction receipt received:", receipt.status);

        if (receipt.status === "success" || receipt.status === 1) {
          // Extract coin address from logs
          try {
            const coinDeployment = getCoinCreateFromLogs(receipt);
            const coinAddress = coinDeployment?.coin;

            if (coinAddress) {
              console.log("Extracted coin address:", coinAddress);

              // Update the quote record with the token address
              await updateQuoteWithTokenAddress(
                quoteId,
                txHash,
                coinAddress,
                metadataUrl,
                splitContractInfo
              );
            } else {
              console.error("Failed to extract coin address from receipt");
            }
          } catch (extractError) {
            console.error("Error extracting coin address:", extractError);
          }
        } else {
          console.error("Transaction failed:", receipt);
        }
      } catch (receiptError) {
        console.error("Error getting transaction receipt:", receiptError);

        // Try again after another delay
        setTimeout(async () => {
          try {
            const retryReceipt = await publicClient.getTransactionReceipt({
              hash: txHash,
            });

            if (
              retryReceipt.status === "success" ||
              retryReceipt.status === 1
            ) {
              const coinDeployment = getCoinCreateFromLogs(retryReceipt);
              const coinAddress = coinDeployment?.coin;

              if (coinAddress) {
                console.log("Extracted coin address on retry:", coinAddress);
                await updateQuoteWithTokenAddress(
                  quoteId,
                  txHash,
                  coinAddress,
                  metadataUrl,
                  splitContractInfo
                );
              }
            }
          } catch (finalError) {
            console.error("Final attempt failed:", finalError);
          }
        }, 15000); // Try again after 15 seconds
      }
    }, 10000); // Initial check after 10 seconds
  } catch (error) {
    console.error("Error in waitForTransactionAndUpdateQuote:", error);
  }
}

/**
 * Update quote record with token address details and split info
 */
async function updateQuoteWithTokenAddress(
  quoteId,
  txHash,
  coinAddress,
  metadataUrl,
  splitContractInfo
) {
  try {
    console.log("Updating quote with token details:", {
      quoteId,
      txHash,
      coinAddress,
      metadataUrl,
    });

    const dexscreenerUrl = `https://dexscreener.com/base/${coinAddress}`;
    console.log("DEX Screener URL:", dexscreenerUrl);

    // Build update data with token details
    const updateData = {
      zoraTokenAddress: coinAddress,
      zoraTxHash: txHash,
      tokenMetadataUrl: metadataUrl,
      dexscreenerUrl: dexscreenerUrl,
    };

    // Add split contract info if available
    if (splitContractInfo) {
      updateData.splitContractAddress = splitContractInfo.splitAddress;
      updateData.splitContractTxHash = splitContractInfo.txHash;
      updateData.platformPercentage = splitContractInfo.platformPercentage;
      updateData.creatorPercentage = splitContractInfo.creatorPercentage;
    }

    const response = await fetch(`/api/quote/${quoteId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Quote updated successfully:", data);
    } else {
      const error = await response.text();
      console.error("Failed to update quote:", error);
    }
  } catch (error) {
    console.error("Error updating quote with token address:", error);
  }
}
