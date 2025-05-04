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
    let symbol = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);
    if (symbol.length < 3) symbol = (symbol + "QQQ").substring(0, 3);

    const metadataUrl = `${APP_URL}/api/metadata?title=${encodeURIComponent(
      title
    )}&description=${encodeURIComponent(
      `Quote token for "${title}"`
    )}&image=${encodeURIComponent(imageUrl)}`;

    const coinParams = {
      name: title,
      symbol,
      uri: metadataUrl,
      payoutRecipient: creatorAddress,
      owners: [creatorAddress], // optional but explicit
      tickLower: -199200, // optional, default for WETH pairs
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
export async function getZoraCoinMetadata(coinAddress) {
  try {
    const metadataUrl = `${APP_URL}/api/metadata?address=${coinAddress}`;
    const response = await fetch(metadataUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Zora coin metadata");
    }

    const metadata = await response.json();
    return metadata;
  } catch (error) {
    console.error("Error fetching Zora coin metadata:", error);
    throw error;
  }
}
export async function getZoraCoinImage(coinAddress) {
  try {
    const metadataUrl = `${APP_URL}/api/metadata?address=${coinAddress}`;
    const response = await fetch(metadataUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Zora coin image");
    }

    const metadata = await response.json();
    return metadata.image;
  } catch (error) {
    console.error("Error fetching Zora coin image:", error);
    throw error;
  }
}