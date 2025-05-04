import { createCoin } from "@zoralabs/coins-sdk";

const APP_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app"
).replace(/\/$/, "");

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    const symbol =
      title
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 5) || "QUOTE";
    const metadataUrl = `${APP_URL}/api/metadata?title=${encodeURIComponent(
      title
    )}&description=${encodeURIComponent(
      `Quote token for "${title}"`
    )}&image=${encodeURIComponent(imageUrl)}`;

    // No need to test the URL in the browser; Zora will fetch it on-chain

    const coinParams = {
      name: title,
      symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      initialPurchaseWei: 0n,
    };

    const result = await createCoin(coinParams, walletClient, publicClient);

    return {
      address: result.address,
      txHash: result.hash,
    };
  } catch (error) {
    console.error("Error creating Zora coin:", error);
    throw error;
  }
}
