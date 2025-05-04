import { createCoin } from "@zoralabs/coins-sdk";
import { uploadMetadataToIPFS } from "./uploadToIPFS";

/**
 * Deploys a new Zora coin using IPFS-hosted metadata.
 * @param walletClient - wagmi wallet client
 * @param publicClient - wagmi public client
 * @param title       - quote title (used as name & symbol)
 * @param imageUrl    - URL of the quote image (can be HTTPS or ipfs://)
 * @param creatorAddress - user’s wallet address
 */
export async function createZoraCoin({
  walletClient,
  publicClient,
  title,
  imageUrl,
  creatorAddress,
}) {
  // ensure symbol is 3–8 uppercase alphanumerics
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

  // upload metadata & get ipfs:// URI
  const uri = await uploadMetadataToIPFS(metadata);

  // prepare Zora createCoin args
  const coinParams = {
    name: title,
    symbol,
    uri, // ipfs://...
    payoutRecipient: creatorAddress,
    owners: [creatorAddress], // defaults to payoutRecipient
    platformReferrer: "0x0000000000000000000000000000000000000000",
    currency: "0x4200000000000000000000000000000000000006", // Base ETH
    tickLower: -199200,
    initialPurchaseWei: 0n,
    orderSize: 0n,
  };

  const result = await createCoin(coinParams, walletClient, publicClient);
  return { address: result.address, txHash: result.hash };
}
