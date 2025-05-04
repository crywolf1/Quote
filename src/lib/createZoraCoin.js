import { createCoin } from "@zoralabs/coins-sdk";
const ZERO = "0x0000000000000000000000000000000000000000";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  try {
    // build symbol…
    let symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);
    if (symbol.length < 3) symbol = symbol.padEnd(3, "Q");

    // your metadata URL…
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL;
    const metadataUrl =
      `${base}/api/metadata` +
      `?title=${encodeURIComponent(title)}` +
      `&image=${encodeURIComponent(imageUrl)}`;

    const coinParams = {
      name: title,
      symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      platformReferrer: ZERO,
      currency: ZERO, // <—— force ETH pool
      // tickLower: -199200 // optional: SDK default is fine when currency=ZERO
    };

    const { address, hash } = await createCoin(
      coinParams,
      walletClient,
      publicClient
    );
    return { address, txHash: hash };
  } catch (error) {
    console.error("Coin creation error:", error);
    throw error;
  }
}
