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
    // Basic validation
    if (!walletClient?.account?.address)
      throw new Error("Wallet not connected");
    if (!coinAddress) throw new Error("Coin contract address required");

    console.log("Starting update for coin contract:", coinAddress);
    console.log("Using wallet:", walletClient.account.address);

    // 1. Create metadata and upload to get IPFS URL
    const metadataRes = await fetch("/api/update-token-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: title,
        description: `Quote: ${description}`,
        image: imageUrl,
        attributes: [{ trait_type: "Update ID", value: Date.now().toString() }],
      }),
    });

    if (!metadataRes.ok) throw new Error("Failed to upload metadata");

    const metadataData = await metadataRes.json();
    const metadataUrl = metadataData.ipfsUrl || metadataData.url;

    if (!metadataUrl?.startsWith("ipfs://")) {
      console.warn(
        "Warning: URI doesn't use IPFS protocol, this may cause issues"
      );
    }

    console.log("Using metadata URL:", metadataUrl);

    // 2. Call Zora SDK to update the token URI - keep this simple!
    const updateParams = {
      coin: coinAddress, // This should be the token contract address
      newURI: metadataUrl,
    };

    // Execute the update
    console.log("Sending update with params:", updateParams);
    const result = await updateCoinURI(
      updateParams,
      walletClient,
      publicClient
    );

    console.log("Update successful! Transaction hash:", result.hash);
    return {
      success: true,
      txHash: result.hash,
      explorerUrl: `https://basescan.org/tx/${result.hash}`,
    };
  } catch (error) {
    console.error("Update failed:", error);
    return {
      error: error.message || "Failed to update token",
      details: error.toString(),
    };
  }
}
