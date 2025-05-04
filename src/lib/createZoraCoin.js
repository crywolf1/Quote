import { createCoin } from "@zoralabs/coins-sdk";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  // 1) build symbol
  let symbol = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 8);
  if (symbol.length < 3) symbol = (symbol + "QQQ").substring(0, 3);

  // 2) metadata
  const metadata = {
    name: title,
    description: `Quote token for "${title}"`,
    image: imageUrl,
    properties: { category: "social" },
  };

  // 3) pin on your server
  const pinRes = await fetch("/api/pin-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const { uri: ipfsUri } = await pinRes.json();

  // 4) pick a reliable URI for SDK validation
  const httpUri = ipfsUri.replace(
    "ipfs://",
    "https://cloudflare-ipfs.com/ipfs/"
  );

  const coinParams = {
    name: title,
    symbol,
    uri: httpUri, // <— use HTTP gateway
    payoutRecipient: creatorAddress,
    owners: [creatorAddress],
    platformReferrer: "0x0000000000000000000000000000000000000000",
    currency: "0x4200000000000000000000000000000000000006",
    tickLower: -199200,
    initialPurchaseWei: 0n,
    orderSize: 0n,
  };

  // 5) mint (with optional Arweave fallback)
  try {
    const result = await createCoin(coinParams, walletClient, publicClient);
    return { address: result.address, txHash: result.hash };
  } catch (e) {
    if (e.message.includes("Metadata fetch failed")) {
      console.warn("Falling back to Arweave URI");
      coinParams.uri = "ar://NLGaNoj-CfjgKvpbxbwCH7YlLKEZxGWsLIlVvvOznoA";
      const result = await createCoin(coinParams, walletClient, publicClient);
      return { address: result.address, txHash: result.hash };
    }
    throw e;
  }
}
