import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Public client for read operations with more robust configuration
export const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org", {
    timeout: 90000, // Increased timeout for Zora operations
    retryCount: 3,
    retryDelay: 1500,
  }),
});

// Simplified wallet client validation
export function getWalletClient(address, wagmiWalletClient) {
  if (!wagmiWalletClient) {
    console.error("Wallet client not available");
    throw new Error("Wallet client not available");
  }

  // Basic validation only - don't throw unnecessary errors
  if (!wagmiWalletClient.account?.address) {
    console.warn("Wallet client may not be fully initialized");
  }

  return wagmiWalletClient;
}

// Simple check for wallet readiness
export function isWalletReady(wagmiWalletClient) {
  return Boolean(wagmiWalletClient?.account?.address);
}