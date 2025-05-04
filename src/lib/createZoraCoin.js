import { createCoin } from "@zoralabs/coins-sdk";

// Use a known-good Arweave URI that resolves to HTTPS
const ARWEAVE_FALLBACK =
  "https://arweave.net/NLGaNoj-CfjgKvpbxbwCH7YlLKEZxGWsLIlVvvOznoA";

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

  // 4) Prepare Zora coin params using raw ipfs:// URI or direct HTTPS URL
  const coinParams = {
    name: title,
    symbol,
    // Use direct HTTPS URL to avoid gateway issues
    uri: ARWEAVE_FALLBACK, // Skip IPFS and use known-good HTTPS Arweave URI
    payoutRecipient: creatorAddress,
    owners: [creatorAddress],
    platformReferrer: "0x0000000000000000000000000000000000000000",
    currency: "0x4200000000000000000000000000000000000006", // Base ETH
    tickLower: -199200,
    initialPurchaseWei: 0n,
    orderSize: 0n,
  };

  // 5) Deploy the coin directly with Arweave URL
  try {
    const result = await createCoin(coinParams, walletClient, publicClient);
    return { address: result.address, txHash: result.hash };
  } catch (e) {
    console.error("Coin creation error:", e);
    throw e;
  }
}
