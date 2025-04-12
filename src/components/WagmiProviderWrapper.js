"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, walletConnect } from "wagmi/connectors";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterFrame({
      name: "Quote App",
      description: "Quote App using Farcaster",
      url: "https://quote-production-679a.up.railway.app",
      icons: ["https://quote-production-679a.up.railway.app/icon.png"],
    }),
    walletConnect({
      projectId,
      metadata: {
        name: "Quote App",
        description: "Quote App using Farcaster",
        url: "https://quote-production-679a.up.railway.app",
        icons: ["https://quote-production-679a.up.railway.app/icon.png"],
      },
    }),
    injected(),
  ],
});

export default function WagmiProviderWrapper({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
