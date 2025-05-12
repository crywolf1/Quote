import { createCoin } from "@zoralabs/coins-sdk";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl, // This is your base64 image
  creatorAddress,
}) {
  try {
    // Validate inputs
    if (!walletClient) throw new Error("Wallet client not provided.");
    if (!creatorAddress) throw new Error("Creator address required.");
    if (!title || typeof title !== "string")
      throw new Error("Valid title required.");

    // Build symbol: Convert title to uppercase, remove non-alphanumeric, limit to 8 chars
    const symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);

    const finalSymbol = symbol.length > 0 ? symbol : "QUOTE";

    // Upload image to Cloudinary using your existing API
    console.log("Uploading image to Cloudinary...");
    const uploadRes = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageUrl }),
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload image to Cloudinary");
    }

    const { url: cloudinaryUrl } = await uploadRes.json();

    // Create metadata JSON
    const metadata = {
      name: title,
      description: `Quote token for "${title}"`,
      image: cloudinaryUrl,
      attributes: [
        { trait_type: "Type", value: "Quote" },
        { trait_type: "Created", value: new Date().toISOString() },
      ],
    };

    // Host metadata on your server
    console.log("Creating metadata...");
    const metadataRes = await fetch("/api/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });

    if (!metadataRes.ok) {
      throw new Error("Failed to create metadata");
    }

    const { url: metadataUrl } = await metadataRes.json();

    console.log("Metadata URL:", metadataUrl);

    // Define coin parameters
    const coinParams = {
      name: title,
      symbol: finalSymbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
    };

    console.log("Creating Zora coin with params:", coinParams);

    // Create the coin
    const { address, hash } = await createCoin(
      coinParams,
      walletClient,
      publicClient
    );

    console.log("Coin creation successful!");
    console.log("- Token address:", address);
    console.log("- Transaction hash:", hash);

    return { address, txHash: hash };
  } catch (error) {
    console.error("Error creating Zora coin:", error);

    if (error.cause?.data) {
      console.error("Contract revert data:", error.cause.data);
    }

    if (error.message.includes("0x4ab38e08")) {
      throw new Error(
        "Failed to create token: Name or symbol may be invalid. Try a different title."
      );
    } else if (error.message.includes("user rejected")) {
      throw new Error("Transaction was rejected by user.");
    } else {
      throw new Error(`Failed to create Zora coin: ${error.message}`);
    }
  }
}
