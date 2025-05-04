import { createCoin } from "@zoralabs/coins-sdk";
const ZERO = "0x0000000000000000000000000000000000000000";

export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  // 1) Build symbol
  let symbol = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 8);
  if (symbol.length < 3) symbol = symbol.padEnd(3, "Q");

  // 2) Metadata URL
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL;
  const metadataUrl =
    `${base}/api/metadata` +
    `?title=${encodeURIComponent(title)}` +
    `&image=${encodeURIComponent(imageUrl)}`;

  // 3) Only the fields in the official CreateCoinArgs
  const coinParams = {
    name: title,
    symbol,
    uri: metadataUrl,
    payoutRecipient: creatorAddress,
    platformReferrer: ZERO, // optional
    tickLower: -199200, // the Uniswap v3 default lower tick for ETH/WETH
    initialPurchaseWei: 0n, // send 0 ETH on creation
  };
  // 4) Mint
  const { address, hash } = await createCoin(
    coinParams,
    walletClient,
    publicClient
  );
  return { address, txHash: hash };
}
