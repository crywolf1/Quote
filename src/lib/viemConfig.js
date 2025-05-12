import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Public client for read operations with more robust configuration
export const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org", {
    timeout: 60000, // 60 second timeout for long-running operations
    retryCount: 3, // Retry failed requests
    retryDelay: 1000, // 1 second between retries
  }),
});

// Improved helper function to get wallet client with better validation
export function getWalletClient(address, wagmiWalletClient) {
  if (!wagmiWalletClient) {
    console.error(
      "Wallet client not available - connection may not be initialized"
    );
    throw new Error("Wallet client not available");
  }

  // Validate that the wallet client is properly configured
  if (!wagmiWalletClient.account || !wagmiWalletClient.account.address) {
    console.error("Wallet client is missing account information");
    throw new Error("Wallet client is improperly configured");
  }

  // Ensure the right address is connected
  if (
    address &&
    address.toLowerCase() !== wagmiWalletClient.account.address.toLowerCase()
  ) {
    console.warn(
      `Address mismatch: Expected ${address}, got ${wagmiWalletClient.account.address}`
    );
  }

  return wagmiWalletClient;
}

// Add a utility function to verify wallet readiness
export function isWalletReady(wagmiWalletClient) {
  return Boolean(
    wagmiWalletClient &&
      wagmiWalletClient.account &&
      wagmiWalletClient.account.address
  );
}
