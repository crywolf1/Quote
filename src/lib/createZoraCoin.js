import { createCoin } from "@zoralabs/coins-sdk";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // 1) Build symbol
    let symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);
    if (symbol.length < 3) symbol = symbol.padEnd(3, "Q");

    // 2) Point at your dynamic metadata route
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL;
    const metadataUrl = `${base}/api/metadata?title=${encodeURIComponent(
      title
    )}&image=${encodeURIComponent(imageUrl)}`;

    // 3) Minimal Zora params
    const coinParams = {
      name: title,
      symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      platformReferrer: "0x0000000000000000000000000000000000000000",
    };

    // 4) Mint
    const result = await createCoin(coinParams, walletClient, publicClient);
    return { address: result.address, txHash: result.hash };
  } catch (error) {
    console.error("Coin creation error:", error);
    throw error;
  }
}
