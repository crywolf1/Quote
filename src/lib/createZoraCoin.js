import { createCoin } from "@zoralabs/coins-sdk";

const APP_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://quote-dusky.vercel.app").replace(/\/$/, "");

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    let symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);
    if (symbol.length < 3) symbol = (symbol + "QQQ").substring(0, 3);

    const metadataUrl = `${APP_URL}/api/metadata?title=${encodeURIComponent(title)}&description=${encodeURIComponent(`Quote token for "${title}"`)}&image=${encodeURIComponent(imageUrl)}`;

    const coinParams = {
      name: title,
      symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      owners: [creatorAddress],
      platformReferrer: "0x0000000000000000000000000000000000000000", // explicitly set
      currency: "0x4200000000000000000000000000000000000006", // Base ETH
      tickLower: -199200,
      initialPurchaseWei: 0n,
      orderSize: 0n,
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