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
      console.error("[ZORA UPDATE] Wallet client validation failed:", {
        walletClient,
      });
      throw new Error("Wallet client not properly initialized");
    }

    if (!coinAddress) throw new Error("Coin address required");
    if (!title) throw new Error("Title required");
    if (!imageUrl) throw new Error("Image URL required");
    if (!description) throw new Error("Description required");

    console.log(
      "[ZORA UPDATE] Starting token update process for coin:",
      coinAddress
    );
    console.log("[ZORA UPDATE] Wallet address:", walletClient.account.address);
    console.log("[ZORA UPDATE] New image URL:", imageUrl);
    console.log("[ZORA UPDATE] New description:", description);

    // Step 1: Create metadata with timestamp to force refresh
    console.log("[ZORA UPDATE] Creating metadata...");
    const metadata = {
      name: title,
      description: `Quote: ${description}`,
      image: imageUrl,
      attributes: [
        {
          trait_type: "Last Updated",
          value: new Date().toISOString(),
        },
        {
          trait_type: "Update ID", // Random value to force new content hash
          value: Math.random().toString(36).substring(2, 15),
        },
      ],
    };

    // Step 2: Upload metadata to get URL - using our specialized update endpoint
    let metadataUrl;
    try {
      console.log("[ZORA UPDATE] Uploading updated metadata...");
      const metadataRes = await fetch("/api/update-token-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
        cache: "no-cache", // Prevent caching
      });

      if (!metadataRes.ok) {
        const errorText = await metadataRes.text();
        console.error("[ZORA UPDATE] Metadata API error:", errorText);
        throw new Error("Failed to create metadata");
      }

      const responseText = await metadataRes.text();
      console.log("[ZORA UPDATE] Raw metadata API response:", responseText);

      let metadataData;
      try {
        metadataData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "[ZORA UPDATE] JSON parse error for metadata:",
          parseError,
          "Response:",
          responseText
        );
        throw new Error(
          `Invalid JSON from metadata API: ${parseError.message}`
        );
      }

      console.log("[ZORA UPDATE] Parsed metadata API response:", metadataData);

      // Check for the IPFS URL property first (preferred by Zora)
      if (metadataData.ipfsUrl) {
        metadataUrl = metadataData.ipfsUrl;
        console.log(
          "[ZORA UPDATE] Using IPFS URL for token update:",
          metadataUrl
        );
      } else if (metadataData.url) {
        // Fall back to regular URL if IPFS URL is not available
        metadataUrl = metadataData.url;
        console.log("[ZORA UPDATE] Falling back to HTTP URL:", metadataUrl);
      } else {
        console.error(
          "[ZORA UPDATE] Missing URL in metadata response:",
          metadataData
        );
        throw new Error("Metadata response missing URL property");
      }

      // CRITICAL: Verify the URL meets Zora requirements
      if (
        !metadataUrl.startsWith("ipfs://") &&
        !metadataUrl.startsWith("https://")
      ) {
        console.error(
          "[ZORA UPDATE] Invalid metadata URL format:",
          metadataUrl
        );
        throw new Error(
          "Metadata URL must start with ipfs:// or https:// for Zora"
        );
      }

      // Validate metadata is accessible via gateway
      try {
        // For IPFS URLs, convert to HTTP gateway URL for checking
        let checkUrl;
        if (metadataUrl.startsWith("ipfs://")) {
          // Try multiple gateways for better reliability
          checkUrl = `https://ipfs.io/ipfs/${metadataUrl.replace(
            "ipfs://",
            ""
          )}`;
        } else {
          checkUrl = metadataUrl;
        }

        console.log("[ZORA UPDATE] Verifying metadata content at:", checkUrl);

        // Fetch the actual content, not just headers
        const validateRes = await fetch(checkUrl, {
          cache: "no-cache",
          headers: { Accept: "application/json" },
        });

        if (!validateRes.ok) {
          console.warn(
            "[ZORA UPDATE] Warning: Metadata URL not immediately accessible:",
            checkUrl
          );
          console.log("[ZORA UPDATE] Status:", validateRes.status);

          // If the primary gateway fails, try a backup
          if (metadataUrl.startsWith("ipfs://")) {
            const backupUrl = `https://gateway.pinata.cloud/ipfs/${metadataUrl.replace(
              "ipfs://",
              ""
            )}`;
            console.log("[ZORA UPDATE] Trying backup gateway:", backupUrl);

            try {
              const backupRes = await fetch(backupUrl, {
                cache: "no-cache",
                headers: { Accept: "application/json" },
              });

              if (backupRes.ok) {
                console.log("[ZORA UPDATE] Backup gateway access successful");
              } else {
                console.warn(
                  "[ZORA UPDATE] Backup gateway also failed:",
                  backupRes.status
                );
              }
            } catch (backupError) {
              console.warn(
                "[ZORA UPDATE] Backup gateway error:",
                backupError.message
              );
            }
          }
        } else {
          // Validate the content actually contains our updates
          const content = await validateRes.json();
          console.log("[ZORA UPDATE] Fetched metadata content:", content);

          // Make sure the metadata contains our expected values
          if (content.name !== title || !content.image) {
            console.warn(
              "[ZORA UPDATE] Warning: Metadata content doesn't match what we uploaded!"
            );
          } else {
            console.log(
              "[ZORA UPDATE] Metadata content verified - contains correct data"
            );
          }
        }
      } catch (validateErr) {
        console.warn(
          "[ZORA UPDATE] Could not validate metadata URL:",
          validateErr
        );
        // Continue anyway since IPFS URLs might not be immediately accessible
      }

      // Check current token URI for comparison
      try {
        console.log("[ZORA UPDATE] Checking current token URI...");

        // Get the current contract URI
        // Note: this may need to be adjusted based on your contract's actual interface
        const currentUri = await publicClient.readContract({
          address: coinAddress,
          abi: [
            {
              inputs: [],
              name: "contractURI",
              outputs: [{ internalType: "string", name: "", type: "string" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "contractURI",
        });

        console.log("[ZORA UPDATE] Current contract URI:", currentUri);
        console.log("[ZORA UPDATE] New URI will be:", metadataUrl);

        if (currentUri === metadataUrl) {
          console.warn(
            "[ZORA UPDATE] Warning: New URI is identical to current URI!"
          );
        }
      } catch (uriError) {
        console.warn(
          "[ZORA UPDATE] Could not check current URI:",
          uriError.message
        );
        // Continue anyway - this is just for debugging
      }
    } catch (metadataError) {
      console.error("[ZORA UPDATE] Metadata error:", metadataError);
      throw new Error(`Metadata error: ${metadataError.message}`);
    }

    // Step 3: Use updateCoinURI to update the coin's metadata URI
    console.log("[ZORA UPDATE] Updating Zora coin URI to:", metadataUrl);

    // These are the params to pass to the SDK's updateCoinURI function
    const updateParams = {
      coin: coinAddress,
      newURI: metadataUrl,
    };

    try {
      // Verify ownership before sending transaction
      try {
        console.log("[ZORA UPDATE] Verifying wallet ownership permission...");

        // This is a common pattern for checking ownership, but your contract might be different
        const ownerAddressResult = await publicClient.readContract({
          address: coinAddress,
          abi: [
            {
              inputs: [],
              name: "owner",
              outputs: [{ internalType: "address", name: "", type: "address" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "owner",
        });

        console.log("[ZORA UPDATE] Contract owner:", ownerAddressResult);
        console.log(
          "[ZORA UPDATE] Current wallet:",
          walletClient.account.address
        );

        if (
          ownerAddressResult.toLowerCase() !==
          walletClient.account.address.toLowerCase()
        ) {
          console.warn(
            "[ZORA UPDATE] Warning: Your wallet may not be the owner of this token!"
          );
        } else {
          console.log("[ZORA UPDATE] Wallet ownership verified");
        }
      } catch (ownerError) {
        console.warn(
          "[ZORA UPDATE] Could not verify ownership:",
          ownerError.message
        );
        // Continue anyway since the contract will enforce ownership
      }

      console.log(
        "[ZORA UPDATE] Sending update transaction with params:",
        updateParams
      );

      // Add chain ID verification
      const chainId = await publicClient.getChainId();
      console.log("[ZORA UPDATE] Connected to chain ID:", chainId);

      if (chainId !== 8453) {
        // Base chain ID
        console.error(
          "[ZORA UPDATE] Warning: Connected to chain ID",
          chainId,
          "but Base chain ID is 8453"
        );
      }

      // Try direct contract call if SDK method fails
      let result;
      try {
        // Use the SDK's updateCoinURI function to update the metadata
        console.log("[ZORA UPDATE] Calling Zora SDK updateCoinURI...");
        result = await updateCoinURI(updateParams, walletClient, publicClient, {
          // Don't wait for confirmations to avoid timeouts
          wait: false,
        });

        console.log("[ZORA UPDATE] SDK call succeeded:", result);
      } catch (sdkError) {
        console.error(
          "[ZORA UPDATE] SDK call failed, trying direct contract call:",
          sdkError
        );

        // Try direct contract call as fallback
        try {
          console.log("[ZORA UPDATE] Attempting direct contract call...");

          // This is a direct contract call that bypasses the SDK
          // The function name might be different in your contract - check your contract code
          const directResult = await walletClient.writeContract({
            address: coinAddress,
            abi: [
              {
                inputs: [
                  { internalType: "string", name: "newURI", type: "string" },
                ],
                name: "setTokenURI", // This name might be different for your contract
                outputs: [],
                stateMutability: "nonpayable",
                type: "function",
              },
            ],
            functionName: "setTokenURI", // Match the name from the ABI above
            args: [metadataUrl],
          });

          console.log(
            "[ZORA UPDATE] Direct contract call succeeded:",
            directResult
          );
          result = { hash: directResult };
        } catch (directError) {
          console.error(
            "[ZORA UPDATE] Direct contract call also failed:",
            directError
          );
          throw directError; // Re-throw to be caught by outer catch block
        }
      }

      const hash = result.hash;
      console.log(
        "[ZORA UPDATE] Update transaction sent successfully! Hash:",
        hash
      );

      // Immediately return success with the hash
      const txExplorerUrl = `https://basescan.org/tx/${hash}`;

      console.log(
        "[ZORA UPDATE] Token update complete, explorer URL:",
        txExplorerUrl
      );

      // Optionally verify the transaction has been mined after a delay
      setTimeout(async () => {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash });
          console.log("[ZORA UPDATE] Transaction receipt:", receipt);
          console.log("[ZORA UPDATE] Transaction status:", receipt.status);

          // If transaction succeeded, check the new token URI after a delay
          if (receipt.status === "success" || receipt.status === 1) {
            setTimeout(async () => {
              try {
                const updatedUri = await publicClient.readContract({
                  address: coinAddress,
                  abi: [
                    {
                      inputs: [],
                      name: "contractURI",
                      outputs: [
                        { internalType: "string", name: "", type: "string" },
                      ],
                      stateMutability: "view",
                      type: "function",
                    },
                  ],
                  functionName: "contractURI",
                });

                console.log("[ZORA UPDATE] Updated contract URI:", updatedUri);

                if (updatedUri === metadataUrl) {
                  console.log(
                    "[ZORA UPDATE] Success! Contract URI has been updated"
                  );
                } else {
                  console.warn(
                    "[ZORA UPDATE] Warning: Contract URI doesn't match what we set"
                  );
                }
              } catch (finalError) {
                console.error(
                  "[ZORA UPDATE] Error checking final URI:",
                  finalError.message
                );
              }
            }, 30000); // Check after 30 seconds
          }
        } catch (receiptError) {
          console.log(
            "[ZORA UPDATE] Could not get receipt yet (normal for pending tx):",
            receiptError.message
          );
        }
      }, 10000); // Check after 10 seconds

      return {
        status: "pending",
        txHash: hash,
        message: "Update submitted! It will be confirmed shortly.",
        explorerUrl: txExplorerUrl,
      };
    } catch (contractError) {
      console.error("[ZORA UPDATE] Contract update error:", contractError);
      console.error(
        "[ZORA UPDATE] Full error object:",
        JSON.stringify(contractError, null, 2)
      );

      const errorDetails = contractError.message || "";

      console.log("[ZORA UPDATE] Error message details:", errorDetails);

      if (errorDetails.includes("OnlyOwner")) {
        console.error(
          "[ZORA UPDATE] Access denied: Only the coin owner can update"
        );
        return { error: "Only the coin owner can update the metadata." };
      } else if (errorDetails.includes("user rejected")) {
        console.error("[ZORA UPDATE] Transaction rejected by user");
        return { error: "Transaction was rejected in your wallet." };
      } else if (
        errorDetails.includes("timeout") ||
        errorDetails.includes("timed out")
      ) {
        // Handle timeout errors similar to creation function
        console.log(
          "[ZORA UPDATE] Transaction timeout - checking for hash in error message"
        );
        const txHashMatch = errorDetails.match(/hash\s*["']([^"']+)["']/i);
        const extractedTxHash = txHashMatch ? txHashMatch[1] : null;

        if (extractedTxHash) {
          console.log(
            "[ZORA UPDATE] Found transaction hash in error message:",
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
          console.error(
            "[ZORA UPDATE] Transaction timed out without hash information"
          );
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
        console.error("[ZORA UPDATE] Unhandled contract error");
        return {
          error: "Failed to update token metadata. Please try again later.",
          details: contractError.message || "Unknown error",
        };
      }
    }
  } catch (error) {
    console.error("[ZORA UPDATE] Coin update process error:", error);
    return {
      error: "Failed to update token metadata",
      details: error.message || "Unknown error occurred",
    };
  }
}
