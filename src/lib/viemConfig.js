import { createPublicClient, createWalletClient, http } from "viem";
import { base } from "viem/chains";

// Public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

// Utility function to create wallet client
export function getWalletClient(address, wagmiWalletClient) {
  if (!address || !wagmiWalletClient) {
    throw new Error(
      "Wallet address or client not provided. Please connect your wallet."
    );
  }

  return createWalletClient({
    account: address,
    chain: base,
    transport: http("https://mainnet.base.org"),
  });
}
