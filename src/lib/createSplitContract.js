import { createClient } from "@0xsplits/splits-sdk-react";

// Your platform address that will receive a percentage of rewards
const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS; // Replace with your actual address
const PLATFORM_PERCENTAGE = 50; // Platform gets 10% of rewards

/**
 * Creates a split contract using Splits.org
 * Sets up automatic revenue sharing between creator and platform
 *
 * @param {Object} params - Parameters for creating the split
 * @param {Object} params.walletClient - The wallet client to use for transaction signing
 * @param {string} params.creatorAddress - Address of the content creator
 * @returns {Promise<Object>} - The created split contract info
 */
export async function createSplitContract({ walletClient, creatorAddress }) {
  try {
    // Basic validation
    if (!walletClient || !walletClient.account?.address) {
      throw new Error("Wallet client not properly initialized");
    }

    if (!creatorAddress) {
      throw new Error("Creator address is required");
    }

    console.log(
      `Creating split contract: ${PLATFORM_PERCENTAGE}% to platform, ${
        100 - PLATFORM_PERCENTAGE
      }% to creator`
    );

    // Initialize splits client
    const splitsClient = createClient({
      chainId: 8453, // Base chain ID
      // The Splits SDK expects a signer compatible with ethers.js
      // We need to adapt the walletClient.account to match the expected interface
      signer: {
        getAddress: async () => walletClient.account.address,
        signMessage: async (message) => walletClient.signMessage({ message }),
        _signTypedData: async (domain, types, value) =>
          walletClient.signTypedData({
            domain,
            types,
            primaryType: "Split", // This might need adjustment based on Splits SDK requirements
            message: value,
          }),
        provider: {
          getSigner: () => ({
            getAddress: async () => walletClient.account.address,
            signMessage: async (message) =>
              walletClient.signMessage({ message }),
            _signTypedData: async (domain, types, value) =>
              walletClient.signTypedData({
                domain,
                types,
                primaryType: "Split",
                message: value,
              }),
          }),
        },
      },
    });

    // Convert percentages to proper format (1% = 1000000 in Splits.org)
    // Splits.org uses 10^6 as 100%
    const PERCENTAGE_SCALE = 1000000;
    const platformAllocation = Math.floor(
      (PLATFORM_PERCENTAGE / 100) * PERCENTAGE_SCALE
    );
    const creatorAllocation = PERCENTAGE_SCALE - platformAllocation;

    // Set up recipients with shares in the correct format
    const recipients = [
      {
        recipient: creatorAddress,
        percentAllocation: creatorAllocation,
      },
      {
        recipient: PLATFORM_ADDRESS,
        percentAllocation: platformAllocation,
      },
    ];

    // Create the split using proper formatting
    const createSplitResponse = await splitsClient.createSplit({
      recipients,
      distributorFeePercent: 0, // No distributor fee
      controller: walletClient.account.address, // Creator can update the split
    });

    console.log("Split contract created:", createSplitResponse);

    return {
      splitAddress: createSplitResponse.splitAddress,
      txHash: createSplitResponse.txHash,
      platformAddress: PLATFORM_ADDRESS,
      platformPercentage: PLATFORM_PERCENTAGE,
      creatorPercentage: 100 - PLATFORM_PERCENTAGE,
    };
  } catch (error) {
    console.error("Error creating split contract:", error);
    throw error;
  }
}
