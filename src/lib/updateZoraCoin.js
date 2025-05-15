import { updateCoinURI } from "@zoralabs/coins-sdk";

export async function updateZoraCoin({
  walletClient,
  publicClient,
  coinAddress,
  title,
  imageUrl,
  description,
}) {
  try {
    // Enhanced validation
    if (!walletClient?.account?.address)
      throw new Error("Wallet not connected");
    if (!coinAddress) throw new Error("Coin contract address required");

    console.log("Starting update for coin contract:", coinAddress);
    console.log("Using wallet:", walletClient.account.address);

    // Verify ownership first - critical step that may fix the issue
    try {
      console.log("Verifying token ownership...");
      const ownerAddress = await publicClient.readContract({
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

      console.log("Contract owner:", ownerAddress);
      console.log("Current wallet:", walletClient.account.address);

      if (
        ownerAddress.toLowerCase() !==
        walletClient.account.address.toLowerCase()
      ) {
        throw new Error(
          "Permission denied: Only the token owner can update metadata"
        );
      }

      console.log("Ownership verified, proceeding with update");
    } catch (ownerError) {
      if (ownerError.message.includes("Permission denied")) {
        throw ownerError; // Re-throw ownership errors
      }
      console.warn("Could not verify ownership:", ownerError.message);
      // Continue anyway, the contract will enforce ownership
    }

    // 1. Create metadata and upload to get IPFS URL
    const metadataRes = await fetch("/api/update-token-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: title,
        description: `Quote: ${description}`,
        image: imageUrl,
        attributes: [
          { trait_type: "Update ID", value: Date.now().toString() },
          { trait_type: "Last Updated", value: new Date().toISOString() },
        ],
      }),
    });

    if (!metadataRes.ok) {
      const errorText = await metadataRes.text();
      console.error("Metadata API error:", errorText);
      throw new Error(`Failed to upload metadata: ${errorText}`);
    }

    const metadataData = await metadataRes.json();
    const metadataUrl = metadataData.ipfsUrl || metadataData.url;

    if (!metadataUrl?.startsWith("ipfs://")) {
      console.warn(
        "Warning: URI doesn't use IPFS protocol, this may cause issues"
      );
    }

    console.log("Using metadata URL:", metadataUrl);

    // Check if this metadata URL is different from current
    try {
      const currentURI = await publicClient.readContract({
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

      console.log("Current contract URI:", currentURI);
      console.log("New URI:", metadataUrl);

      if (currentURI === metadataUrl) {
        console.warn(
          "Warning: New URI is identical to current URI. This may cause the update to fail."
        );
      }
    } catch (uriError) {
      console.warn("Could not check current URI:", uriError.message);
    }

    // 2. Call Zora SDK to update the token URI - keep this simple!
    const updateParams = {
      coin: coinAddress, // This should be the token contract address
      newURI: metadataUrl,
    };

    // Execute the update
    console.log("Sending update with params:", updateParams);

    try {
      const result = await updateCoinURI(
        updateParams,
        walletClient,
        publicClient,
        {
          wait: false, // Don't wait for confirmations to avoid timeouts
        }
      );

      console.log("Update transaction sent! Hash:", result.hash);
      return {
        success: true,
        txHash: result.hash,
        explorerUrl: `https://basescan.org/tx/${result.hash}`,
      };
    } catch (sdkError) {
      console.error(
        "SDK update failed, trying direct contract call:",
        sdkError
      );

      // Fallback to direct contract call if SDK method fails
      try {
        console.log("Attempting direct contract call...");

        // This is a direct contract call that bypasses the SDK
        const txHash = await walletClient.writeContract({
          address: coinAddress,
          abi: [
            {
              inputs: [
                { internalType: "string", name: "_uri", type: "string" },
              ],
              name: "setURI", // Try different function name than previously attempted
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "setURI",
          args: [metadataUrl],
        });

        console.log("Direct contract call succeeded:", txHash);
        return {
          success: true,
          txHash: txHash,
          explorerUrl: `https://basescan.org/tx/${txHash}`,
        };
      } catch (directError) {
        // If direct call with setURI fails, try with updateContractURI
        try {
          console.log(
            "First direct call failed, trying alternate function name:",
            directError.message
          );

          const txHash = await walletClient.writeContract({
            address: coinAddress,
            abi: [
              {
                inputs: [
                  { internalType: "string", name: "_uri", type: "string" },
                ],
                name: "updateContractURI", // Alternative function name
                outputs: [],
                stateMutability: "nonpayable",
                type: "function",
              },
            ],
            functionName: "updateContractURI",
            args: [metadataUrl],
          });

          console.log("Alternative direct call succeeded:", txHash);
          return {
            success: true,
            txHash: txHash,
            explorerUrl: `https://basescan.org/tx/${txHash}`,
          };
        } catch (finalError) {
          console.error("All update attempts failed:", finalError);
          throw finalError; // Re-throw to be caught by outer catch block
        }
      }
    }
  } catch (error) {
    console.error("Update failed:", error);

    // Enhanced error handling
    const errorMessage = error.message || "Failed to update token";

    // Check for specific error conditions
    if (
      errorMessage.includes("OnlyOwner") ||
      errorMessage.includes("Permission denied")
    ) {
      return {
        error: "Only the token owner can update the metadata.",
        details: errorMessage,
      };
    } else if (errorMessage.includes("user rejected")) {
      return {
        error: "Transaction rejected in your wallet.",
        details: errorMessage,
      };
    }

    return {
      error: errorMessage,
      details: error.toString(),
    };
  }
}
