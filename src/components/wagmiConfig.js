import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultWallets,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  metaMaskWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { http } from "wagmi";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Configure chains
const chains = [base];

// Get default wallets with priority order
const { wallets } = getDefaultWallets({
  appName: "Quote",
  projectId,
  chains,
});

// Create connectors with additional mobile-friendly wallets
const connectors = connectorsForWallets([
  ...wallets,
  {
    groupName: "Popular",
    wallets: [
      rainbowWallet({ projectId, chains }),
      metaMaskWallet({ projectId, chains }),
      walletConnectWallet({ projectId, chains }),
    ],
  },
]);

// Create Wagmi config
export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [base.id]: http(),
  },
});
