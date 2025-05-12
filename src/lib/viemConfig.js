import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Public client for read operations
export const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

// Helper function to get wallet client
export function getWalletClient(address, wagmiWalletClient) {
  if (!wagmiWalletClient) {
    throw new Error("Wallet client not available");
  }
  return wagmiWalletClient;
}