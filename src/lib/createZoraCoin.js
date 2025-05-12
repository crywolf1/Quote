import { createCoin } from "@zoralabs/coins-sdk";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // Validate inputs
    if (!walletClient) throw new Error("Wallet client not provided.");
    if (!creatorAddress) throw new Error("Creator address required.");
    if (!title || typeof title !== "string")
      throw new Error("Valid title required.");

    // More restrictive symbol creation to avoid contract errors
    // Only use letters A-Z and ensure at least 3 characters
    let symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);

    // Make sure symbol is at least 3 characters
    if (symbol.length < 3) {
      const padding = ["QTE", "ABD", "XYZ"];
      symbol = symbol + padding[0].substring(0, 3 - symbol.length);
    }

    // Check for common reserved words
    const reservedWords = ["ETH", "BTC", "WETH", "USD", "USDT", "USDC", "DAI"];
    if (reservedWords.includes(symbol)) {
      symbol = symbol + "TKN";
    }

    // Create metadata with the existing image URL from the quote
    console.log("Creating metadata...");
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

      const { url: metadataUrl } = await metadataRes.json();
      console.log("Metadata URL:", metadataUrl);

      // Verify metadata URL is accessible
      try {
        const metadataCheck = await fetch(metadataUrl);
        if (!metadataCheck.ok) {
          throw new Error(`Metadata URL not accessible: ${metadataUrl}`);
        }
        const metadata = await metadataCheck.json();
        if (!metadata.name || !metadata.image) {
          throw new Error("Metadata missing required fields");
        }
      } catch (metadataError) {
        console.error("Metadata verification failed:", metadataError);
        throw new Error(
          `Metadata verification failed: ${metadataError.message}`
        );
      }

      // Define coin parameters with minimal required fields
      const coinParams = {
        name: title,
        symbol: symbol,
        uri: metadataUrl,
        payoutRecipient: creatorAddress,
        // Omit optional parameters that could cause issues
      };

      console.log("Creating Zora coin with params:", coinParams);

      // Create the coin with simplified parameters
      const { address, hash } = await createCoin(
        coinParams,
        walletClient,
        publicClient
      );

      console.log("Coin creation successful!");
      console.log("- Token address:", address);
      console.log("- Transaction hash:", hash);

      return { address, txHash: hash };
    } catch (metadataError) {
      console.error("Metadata creation error:", metadataError);
      throw new Error(`Metadata error: ${metadataError.message}`);
    }
  } catch (error) {
    console.error("Error creating Zora coin:", error);

    if (error.cause?.data) {
      console.error("Contract revert data:", error.cause.data);
    }

    // Check for specific error signatures
    if (error.message.includes("0x4ab38e08")) {
      // This is the error code we're seeing - likely invalid symbol/name
      return {
        error: "Invalid token name or symbol. Please try a different title.",
      };
    } else if (error.message.includes("user rejected")) {
      return { error: "Transaction was rejected by user." };
    } else {
      return { error: `Failed to create Zora coin: ${error.message}` };
    }
  }
}
