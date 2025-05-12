import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { http } from "wagmi";

// Your WalletConnect v2 Project ID

// Configure chains list
const chains = [base];

// Set up connectors
const { connectors } = getDefaultWallets({
  appName: "Quoted App",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains,
});

// Create config with http transport - Wagmi v2 syntax
export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [base.id]: http(),
  },
});
