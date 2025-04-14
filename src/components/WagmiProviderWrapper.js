"use client";

import { WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { createConfig, http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const isFrame =
  typeof window !== "undefined" &&
  window?.navigator?.userAgent?.toLowerCase().includes("farcaster");

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: isFrame ? [farcasterFrame()] : [injected()],
});

export default function WagmiProviderWrapper({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
