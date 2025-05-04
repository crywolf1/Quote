import { createCoin } from "@zoralabs/coins-sdk";

const ARWEAVE_FALLBACK = "ar://NLGaNoj-CfjgKvpbxbwCH7YlLKEZxGWsLIlVvvOznoA";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  // 1) Build a valid symbol (3–8 uppercase alphanumerics)
  let symbol = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 8);
  if (symbol.length < 3) symbol = (symbol + "QQQ").substring(0, 3);

  // 2) Prepare metadata
  const metadata = {
    name: title,
    description: `Quote token for "${title}"`,
    image: imageUrl,
    properties: { category: "social" },
  };

  // 3) Pin metadata via your server-side route
  const pinRes = await fetch("/api/pin-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const { uri: ipfsUri, error } = await pinRes.json();
  if (!ipfsUri) throw new Error(error || "Failed to pin metadata");

  // 4) Prepare Zora coin params using raw ipfs:// URI
  const coinParams = {
    name: title,
    symbol,
    uri: ipfsUri, // NO in-browser HEAD checks
    payoutRecipient: creatorAddress,
    owners: [creatorAddress],
    platformReferrer: "0x0000000000000000000000000000000000000000",
    currency: "0x4200000000000000000000000000000000000006", // Base ETH
    tickLower: -199200,
    initialPurchaseWei: 0n,
    orderSize: 0n,
  };

  // 5) Deploy the coin, retry on Arweave if SDK metadata fetch fails
  try {
    const result = await createCoin(coinParams, walletClient, publicClient);
    return { address: result.address, txHash: result.hash };
  } catch (e) {
    // this catch is for the SDK’s own metadata-fetch validation
    if (e.message.includes("Metadata fetch failed")) {
      console.warn("SDK metadata fetch failed, retrying with Arweave URI");
      coinParams.uri = ARWEAVE_FALLBACK;
      const retry = await createCoin(coinParams, walletClient, publicClient);
      return { address: retry.address, txHash: retry.hash };
    }
    throw e;
  }
}
