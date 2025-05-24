import {
  createCoin,
  getCoinCreateFromLogs,
  updatePayoutRecipient,
} from "@zoralabs/coins-sdk";
import { createSplitContract } from "./createSplitContract";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  text,
  imageUrl,
  creatorAddress,
  quoteId,
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

    // Step 1: Create metadata
    console.log("Creating metadata...");
    const metadata = {
      name: title,
      description: `Quote: ${text}`,
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

    // Step 3: Create coin with initial parameters:
    // - Initial tokens go to creator (via owners array)
    // - Initial trading fees also go to creator (via payoutRecipient)
    console.log("Creating Zora coin with initial creator ownership...");

    // Add this to debug environment variables
    console.log("Environment variable check:");
    console.log("Platform address available:", !!process.env.PLATFORM_ADDRESS);
    console.log("Creator address available:", !!creatorAddress);
    console.log(
      "Platform referrer available:",
      !!process.env.PLATFORM_REFERRER
    );

    // MODIFIED: Use creator address directly instead of platform address
    const platformAddress =
      process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || creatorAddress;
    console.log("Using platform address:", platformAddress);

    const coinParams = {
      name: title,
      symbol: title,
      uri: metadataUrl,
      owners: [creatorAddress], // MODIFIED: Set owner to creator directly
      payoutRecipient: creatorAddress, // Keep creator as payoutRecipient
      platformReferrer: process.env.PLATFORM_REFERRER, // Optional: Set platform referrer if needed
      mintToCreator: true, // Explicitly ensure first tokens go to creator
      tickLower: -208200,
    };

    if (
      process.env.PLATFORM_REFERRER &&
      process.env.PLATFORM_REFERRER.startsWith("0x") &&
      process.env.PLATFORM_REFERRER.length === 42
    ) {
      coinParams.platformReferrer = process.env.PLATFORM_REFERRER;
      console.log("Platform referrer added:", process.env.PLATFORM_REFERRER);
    }
    console.log("Setting coin owner to:", coinParams.owners[0]);
    console.log(
      "Initial tokens and fees will go to:",
      coinParams.payoutRecipient
    );

    try {
      console.log("Sending transaction with params:", coinParams);

      // Use the SDK's createCoin function to get a transaction hash
      const result = await createCoin(coinParams, walletClient, publicClient, {
        // Don't wait for confirmations to avoid timeouts
        wait: false,
      });

      const hash = result.hash;
      console.log("Transaction sent successfully! Hash:", hash);

      // Start tracking transaction for coin address extraction and update
      waitForTransactionAndUpdateQuote(
        publicClient,
        hash,
        quoteId,
        metadataUrl,
        creatorAddress
      );

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

/**
 * Wait for transaction confirmation and update quote with token address
 * (No longer updates payoutRecipient to maintain creator ownership)
 */
async function waitForTransactionAndUpdateQuote(
  publicClient,
  txHash,
  quoteId,
  metadataUrl,
  creatorAddress
) {
  try {
    console.log("Waiting for transaction confirmation:", txHash);
    console.log("Will update quote ID after confirmation:", quoteId);

    // Wait for the transaction to be mined
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
                creatorAddress
              );

              // COMMENTED OUT: Keeping creator as payout recipient
              // The following function has been disabled to ensure all trading fees go to the token creator
              // May be re-enabled in the future if revenue sharing is desired
              /*
              await updatePayoutRecipientToPlatform(
                coinAddress,
                publicClient,
                quoteId,
                creatorAddress // Pass creatorAddress explicitly
              );
              */
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
                  creatorAddress
                );

                // COMMENTED OUT: Keeping creator as payout recipient
                // The following function has been disabled to ensure all trading fees go to the token creator
                /*
                await updatePayoutRecipientToPlatform(
                  coinAddress,
                  publicClient,
                  quoteId,
                  creatorAddress
                );
                */
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
 * COMMENTED OUT: This function has been temporarily disabled to maintain creator ownership
 * It may be used in the future to enable revenue sharing between creators and the platform.
 *
 * The function creates a 50/50 split contract and updates the token's payout recipient to
 * distribute trading fees between the creator and platform.
 */
/*
async function updatePayoutRecipientToPlatform(
  coinAddress,
  publicClient,
  quoteId,
  directCreatorAddress
) {
  try {
    console.log(`Setting up 50/50 split for token: ${coinAddress}`);
    console.log(`Direct creator address provided: ${directCreatorAddress}`);
    console.log(`Quote ID: ${quoteId}`);

    // Single source of truth for creator address with multiple fallbacks
    let creatorAddress = directCreatorAddress;

    // Only try to fetch from DB if we don't already have a valid address
    if (!creatorAddress || !creatorAddress.startsWith("0x")) {
      try {
        console.log(
          `No valid direct creator address, fetching from DB for quote ID: ${quoteId}`
        );
        const quoteResponse = await fetch(`/api/quote/${quoteId}`);

        if (!quoteResponse.ok) {
          throw new Error(
            `Failed to fetch quote data: ${quoteResponse.status} ${quoteResponse.statusText}`
          );
        }

        const quoteData = await quoteResponse.json();
        console.log("Quote data retrieved:", JSON.stringify(quoteData));

        // Try to get the creator address from various possible fields
        creatorAddress =
          quoteData.creatorAddress ||
          quoteData.initialPayoutRecipient ||
          quoteData.ownerAddress;

        console.log(`Creator address from DB: ${creatorAddress}`);
      } catch (fetchError) {
        console.error("Error fetching quote data:", fetchError);
        throw new Error(`Failed to get creator info: ${fetchError.message}`);
      }
    }

    // Final validation - ensure we have a valid Ethereum address
    if (
      !creatorAddress ||
      !creatorAddress.startsWith("0x") ||
      creatorAddress.length !== 42
    ) {
      console.error("Invalid or missing creator address:", creatorAddress);
      throw new Error("Creator address not found or invalid");
    }

    console.log(`Confirmed creator address: ${creatorAddress}`);

    // Get platform address from env or use a default
    const platformAddress = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS;

    if (!platformAddress) {
      console.error("Platform address not found in environment variables");
      throw new Error("Platform address not configured");
    }

    console.log(
      `Updating payout recipient to platform address: ${platformAddress}`
    );

    // Step 1: Create a 50/50 split contract using Splits Protocol SDK
    console.log("Creating split contract...");
    const splitContractInfo = await createSplitContract({
      creatorAddress,
      platformAddress,
    });

    console.log(`Split contract created at: ${splitContractInfo.splitAddress}`);

    // Step 2: Call the API route that updates payoutRecipient to the split contract
    console.log(
      `Updating payoutRecipient to split contract: ${splitContractInfo.splitAddress}`
    );
    const response = await fetch("/api/updatePayoutRecipient", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coinAddress,
        quoteId,
        newPayoutRecipient: splitContractInfo.splitAddress,
      }),
    });

    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        console.error("Invalid JSON response:", errorText);
        throw new Error(
          `Server error (${response.status}): ${errorText || "Unknown error"}`
        );
      }

      console.error("PayoutRecipient update failed:", errorData);
      throw new Error(errorData.error || "Failed to update payout recipient");
    }

    // Parse the successful response
    const result = await response.json();
    console.log("PayoutRecipient updated to split contract:", result);

    // Step 3: Update the quote with split contract and payout info
    await updateQuotePayoutInfo(quoteId, {
      payoutRecipientUpdated: true,
      payoutRecipientUpdateHash: result.hash,
      payoutRecipient: splitContractInfo.splitAddress,
      splitContractAddress: splitContractInfo.splitAddress,
      splitContractTxHash: splitContractInfo.txHash,
      platformPercentage: splitContractInfo.platformPercentage,
      creatorPercentage: splitContractInfo.creatorPercentage,
    });

    return {
      success: true,
      splitContractAddress: splitContractInfo.splitAddress,
      payoutRecipientUpdateHash: result.hash,
      platformPercentage: splitContractInfo.platformPercentage,
      creatorPercentage: splitContractInfo.creatorPercentage,
    };
  } catch (error) {
    console.error("Error updating payoutRecipient:", error);

    // Record error in database
    try {
      await updateQuotePayoutInfo(quoteId, {
        payoutRecipientUpdateError: error.message,
        payoutRecipientUpdateAttempted: true,
      });
    } catch (dbError) {
      console.error("Failed to update quote with error info:", dbError);
    }

    throw error;
  }
}
*/

/**
 * Update quote with payout recipient info
 */
async function updateQuotePayoutInfo(quoteId, updateData) {
  try {
    const response = await fetch(`/api/quote/${quoteId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Quote payout info updated successfully:", data);
      return data;
    } else {
      const error = await response.text();
      console.error("Failed to update quote payout info:", error);
      throw new Error(error);
    }
  } catch (error) {
    console.error("Error updating quote payout info:", error);
    throw error;
  }
}

/**
 * Update quote record with token address details
 */
async function updateQuoteWithTokenAddress(
  quoteId,
  txHash,
  coinAddress,
  metadataUrl,
  creatorAddress
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

    // Prepare update data with token details
    const updateData = {
      zoraTokenAddress: coinAddress,
      zoraTxHash: txHash,
      tokenMetadataUrl: metadataUrl,
      dexscreenerUrl: dexscreenerUrl,
      creatorAddress: creatorAddress,
      initialPayoutRecipient: creatorAddress,
    };

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
