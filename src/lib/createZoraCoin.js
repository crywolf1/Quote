import { createCoin } from "@zoralabs/coins-sdk";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  // 1) Build a valid 3–8 character symbol
  let symbol = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 8);
  if (symbol.length < 3) symbol = symbol.padEnd(3, "Q");

  // 2) Point at your metadata API
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL;
  const metadataUrl =
    `${base}/api/metadata` +
    `?title=${encodeURIComponent(title)}` +
    `&image=${encodeURIComponent(imageUrl)}`;

  // 3) Only the exact fields from CreateCoinArgs
  //    (no currency, no tickLower, no initialPurchaseWei)
  const coinParams = {
    name: title,
    symbol,
    uri: metadataUrl,
    payoutRecipient: creatorAddress,
    platformReferrer: "0x0000000000000000000000000000000000000000", // optional
    // tickLower? and initialPurchaseWei? are omitted
  };

  // 4) Mint!
  const { address, hash } = await createCoin(
    coinParams,
    walletClient,
    publicClient
  );
  return { address, txHash: hash };
}
