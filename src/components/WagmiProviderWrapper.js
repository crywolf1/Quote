// src/components/WagmiProviderWrapper.js
"use client";

import { WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { createConfig, http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a QueryClient instance
const queryClient = new QueryClient();

// Wagmi configuration
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [farcasterFrame()],
});

export default function WagmiProviderWrapper({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
