import { createPublicClient, createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { useAccount, useWalletClient } from "wagmi";

// Public client for reading blockchain data (no wallet needed)
export const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

// Function to get wallet client dynamically using Rainbow Kit
export function getWalletClient() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  if (!isConnected || !address || !walletClient) {
    throw new Error(
      "Wallet not connected. Please connect your wallet via Rainbow Kit."
    );
  }

  return createWalletClient({
    account: address,
    chain: base,
    transport: http("https://mainnet.base.org"),
  });
}
