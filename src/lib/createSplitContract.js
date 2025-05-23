/**
 * Creates a Split contract that distributes funds 50/50 between platform and creator
 * Uses the Splits Protocol v1 SDK via API
 */
export async function createSplitContract({
  creatorAddress,
  platformAddress = process.env.PLATFORM_ADDRESS ||
    process.env.PLATFORM_ADDRESS,
}) {
  try {
    console.log(
      `Creating 50/50 split contract between platform and creator...`
    );
    console.log(`Platform: ${platformAddress}`);
    console.log(`Creator: ${creatorAddress}`);

    if (!platformAddress) {
      console.error("Platform address not found in environment variables");
      throw new Error("Platform address not configured");
    }

    if (!creatorAddress) {
      console.error("Creator address is required");
      throw new Error("Creator address is required");
    }

    // Call our API to create the split contract using Splits SDK
    const response = await fetch("/api/createSplit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients: [
          { address: platformAddress, percentAllocation: 500000 }, // 50% (in basis points)
          { address: creatorAddress, percentAllocation: 500000 }, // 50% (in basis points)
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      throw new Error(errorData.error || "Failed to create split contract");
    }

    const result = await response.json();
    console.log("Split contract created:", result);

    return {
      splitAddress: result.splitAddress,
      txHash: result.txHash,
      platformPercentage: result.platformPercentage || 50,
      creatorPercentage: result.creatorPercentage || 50,
    };
  } catch (error) {
    console.error("Error creating split contract:", error);
    throw error;
  }
}
