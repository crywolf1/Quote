import { createCoin } from "@zoralabs/coins-sdk";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  // build symbol (3–8 uppercase chars)
  let symbol = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 8);
  if (symbol.length < 3) symbol = (symbol + "QQQ").substring(0, 3);

  // build metadata JSON
  const metadata = {
    name: title,
    description: `Quote token for "${title}"`,
    image: imageUrl,
    properties: { category: "social" },
  };

  // POST to your server route to pin on IPFS
  const pinResponse = await fetch("/api/pin-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const { uri, error } = await pinResponse.json();
  if (!uri) throw new Error(error || "Failed to pin metadata");

  // prepare Zora coin params
  const coinParams = {
    name: title,
    symbol,
    uri, // ipfs://...
    payoutRecipient: creatorAddress,
    owners: [creatorAddress],
    platformReferrer: "0x0000000000000000000000000000000000000000",
    currency: "0x4200000000000000000000000000000000000006",
    tickLower: -199200,
    initialPurchaseWei: 0n,
    orderSize: 0n,
  };

  // create the coin on‐chain
  const result = await createCoin(coinParams, walletClient, publicClient);
  return { address: result.address, txHash: result.hash };
}
