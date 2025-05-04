import { createCoin } from "@zoralabs/coins-sdk";

const ARWEAVE_FALLBACK = "ar://NLGaNoj-CfjgKvpbxbwCH7YlLKEZxGWsLIlVvvOznoA";
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

/**
 * Creates a Zora coin with reliable metadata URI resolution.
 */
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

  // 2) Prepare metadata object
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

  // 4) Attempt to resolve IPFS via multiple HTTP gateways
  let httpUri;
  for (const gw of IPFS_GATEWAYS) {
    const candidate = ipfsUri.replace("ipfs://", gw);
    try {
      const head = await fetch(candidate, { method: "HEAD" });
      if (head.ok) {
        httpUri = candidate;
        break;
      }
    } catch {
      // ignore and try next
    }
  }
  // Fallback to Arweave if no IPFS gateway succeeded
  if (!httpUri) {
    console.warn(
      "All IPFS gateways failed, falling back to Arweave URI for metadata"
    );
    httpUri = ARWEAVE_FALLBACK;
  }

  // 5) Prepare coin creation parameters
  const coinParams = {
    name: title,
    symbol,
    uri: httpUri,
    payoutRecipient: creatorAddress,
    owners: [creatorAddress],
    platformReferrer: "0x0000000000000000000000000000000000000000",
    currency: "0x4200000000000000000000000000000000000006", // Base ETH
    tickLower: -199200,
    initialPurchaseWei: 0n,
    orderSize: 0n,
  };

  // 6) Deploy the coin, with fallback if SDK metadata check fails
  try {
    const result = await createCoin(coinParams, walletClient, publicClient);
    return { address: result.address, txHash: result.hash };
  } catch (e) {
    if (e.message.includes("Metadata fetch failed")) {
      console.warn("SDK metadata fetch failed, retrying with Arweave URI");
      coinParams.uri = ARWEAVE_FALLBACK;
      const result = await createCoin(coinParams, walletClient, publicClient);
      return { address: result.address, txHash: result.hash };
    }
    throw e;
  }
}
