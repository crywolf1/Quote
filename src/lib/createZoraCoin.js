import { createCoin } from "@zoralabs/coins-sdk";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  // 1. build symbol
  let symbol = title.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 8);
  if (symbol.length < 3) symbol = (symbol + "QQQ").substring(0, 3);

  // 2. build metadata
  const metadata = {
    name: title,
    description: `Quote token for "${title}"`,
    image: imageUrl,
    properties: { category: "social" },
  };

  // 3. upload metadata to IPFS via your API
  const pinRes = await fetch("/api/pin-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const { uri, error } = await pinRes.json();
  if (!uri) throw new Error(error || "Pinata upload failed");

  // 4. mint the coin
  const coinParams = {
    name: title,
    symbol,
    uri, // ipfs://...
    payoutRecipient: creatorAddress,
    owners: [creatorAddress],
    platformReferrer: "0x0000000000000000000000000000000000000000",
    currency: "0x4200000000000000000000000000000000000006", // Base ETH
    tickLower: -199200,
    initialPurchaseWei: 0n,
    orderSize: 0n,
  };

  const result = await createCoin(coinParams, walletClient, publicClient);
  return { address: result.address, txHash: result.hash };
}