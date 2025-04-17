// src/components/WagmiProviderWrapper.js
"use client";

import { WagmiProvider, configureChains, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { metaMask, walletConnect } from "wagmi/connectors";

// QueryClient instance
const queryClient = new QueryClient();

// Wagmi configuration
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterFrame(), // for Farcaster frame-based context
    metaMask(), // for MetaMask browser extension
    walletConnect({ projectId: "YOUR_WALLETCONNECT_PROJECT_ID" }), // get this from WalletConnect dashboard
  ],
});

export default function WagmiProviderWrapper({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
