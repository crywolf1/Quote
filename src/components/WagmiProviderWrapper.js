"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, walletConnect } from "wagmi/connectors";

// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Your WalletConnect project ID from dashboard.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  console.warn("⚠️ WalletConnect projectId not configured");
}

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    injected({
      target: "metaMask",
    }),
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: "Quote App",
        description: "Quote App using Farcaster",
        url: "https://quote-production-679a.up.railway.app",
        icons: ["https://quote-production-679a.up.railway.app/icon.png"],
      },
    }),
  ],
});

export default function WagmiProviderWrapper({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
