import { createCoin } from "@zoralabs/coins-sdk";

/**
 * Creates a Zora token with proper validation and error handling
 * Mimics the Flipp.lol approach that successfully creates Zora coins
 */
export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // Validate basic inputs
    if (!walletClient) throw new Error("Wallet client not provided.");
    if (!creatorAddress) throw new Error("Creator address required.");
    if (!title || typeof title !== "string")
      throw new Error("Valid title required.");
    if (!imageUrl) throw new Error("Image URL required.");

    console.log("Starting token creation process for:", title);

    // Step 1: Prepare metadata
    console.log("Step 1: Preparing metadata...");
    let metadataUrl;
    try {
      const metadataRes = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title,
          description: `Quote token: ${title}`,
          image: imageUrl,
          attributes: [
            { trait_type: "Type", value: "Quote" },
            { trait_type: "Created", value: new Date().toISOString() },
          ],
        }),
      });

      if (!metadataRes.ok) {
        const errorData = await metadataRes.json();
        throw new Error(errorData.error || "Failed to create metadata");
      }

      const metadataData = await metadataRes.json();
      metadataUrl = metadataData.url;

      console.log("Metadata created successfully:", metadataUrl);
    } catch (metadataError) {
      console.error("Metadata preparation failed:", metadataError);
      throw new Error(`Metadata creation failed: ${metadataError.message}`);
    }

    // Step 2: Generate a ticker (like Flipp.lol) - simple and uppercase
    // Create ticker from first 3-5 characters of the title
    let ticker = title
      .replace(/[^a-zA-Z0-9]/g, "") // Remove non-alphanumeric chars
      .toUpperCase()
      .substring(0, 5); // Get first 5 chars max

    // Ensure ticker is at least 3 characters
    if (ticker.length < 3) {
      ticker = ticker + "XYZ".substring(0, 3 - ticker.length);
    }

    // Add randomness to avoid collisions
    const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random A-Z
    ticker = ticker.substring(0, 4) + randomChar;

    console.log("Using ticker:", ticker);

    // Step 3: Use Flipp.lol style parameters
    console.log("Step 2: Preparing coin parameters...");

    // Note: Flipp.lol sets 10M initial supply, so we're mimicking their approach
    const coinParams = {
      name: title, // Use original title as name
      symbol: ticker, // Use generated ticker
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      // Flipp.lol might be setting these parameters:
      // initialSupply: "10000000000000000000000000", // 10M with 18 decimals
      // But the createCoin function handles defaults for us
    };

    // Step 4: Create the coin
    console.log("Step 3: Creating coin with Zora SDK...");
    try {
      // Create with minimal parameters, letting Zora SDK handle the rest
      const coinResult = await createCoin(
        coinParams,
        walletClient,
        publicClient
      );

      console.log("Coin creation successful!");
      console.log("- Token address:", coinResult.address);
      console.log("- Transaction hash:", coinResult.hash);

      return { address: coinResult.address, txHash: coinResult.hash };
    } catch (contractError) {
      console.error("Contract execution error:", contractError);

      // Extract useful information from the error
      const errorDetails = contractError.message || "";
      const errorSignature =
        errorDetails.match(/signature:\s*(0x[a-f0-9]+)/i)?.[1] || "";

      // Handle known error cases with user-friendly messages
      if (errorDetails.includes("0x4ab38e08")) {
        // This specific error often relates to name/symbol issues
        return {
          error:
            "This token name or ticker is already taken or not allowed. Please try a different title.",
        };
      } else if (errorDetails.includes("user rejected")) {
        return { error: "Transaction was rejected in your wallet." };
      } else if (
        errorDetails.includes("timeout") ||
        errorDetails.includes("timed out")
      ) {
        return { error: "Transaction timed out. Please try again later." };
      } else if (
        errorDetails.includes("insufficient funds") ||
        errorDetails.includes("gas")
      ) {
        return {
          error: "Insufficient funds for gas. Please add funds to your wallet.",
        };
      } else {
        // For unknown errors, provide the error signature for debugging
        return {
          error: `Token creation failed. ${
            errorSignature
              ? `(Error code: ${errorSignature})`
              : "Please try again later."
          }`,
        };
      }
    }
  } catch (error) {
    console.error("Coin creation process error:", error);
    return { error: "Failed to create token: " + error.message };
  }
}
