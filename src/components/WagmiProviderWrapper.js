// src/components/WagmiProviderWrapper.js
"use client";

import { WagmiProvider, configureChains, createConfig } from "wagmi";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { wagmiConfig } from "./wagmiConfig";
// QueryClient instance
const queryClient = new QueryClient();

// Wagmi configuration

export default function WagmiProviderWrapper({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
