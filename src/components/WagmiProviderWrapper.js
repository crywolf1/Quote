"use client";

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { wagmiConfig, chains } from "./wagmiConfig"; // Import chains from your config

export default function WagmiProviderWrapper({ children }) {
  // Create a single QueryClient instance that persists across renders
  const queryClient = useMemo(() => new QueryClient(), []);
  const [isFarcasterFrameContext, setIsFarcasterFrameContext] = useState(false);

  // Suppress common errors - combined into a single useEffect
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const errorStr = String(args[0] || "");

      // Filter out known errors
      if (
        errorStr.includes("runtime.sendMessage") ||
        errorStr.includes("cross-origin frame") ||
        errorStr.includes("Error in invocation") ||
        errorStr.includes("chrome.runtime") ||
        errorStr.includes("Failed to read") ||
        errorStr.includes("farcaster")
      ) {
        return; // Suppress these errors
      }

      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError; // Restore on unmount
    };
  }, []);

  // Safely check if we're in a Farcaster frame context
  useEffect(() => {
    const checkFarcasterContext = async () => {
      try {
        // Use dynamic import to prevent SSR issues
        const { sdk } = await import("@farcaster/frame-sdk");
        setIsFarcasterFrameContext(sdk?.isFrameContext || false);
      } catch (e) {
        // SDK not available or not in frame context
        setIsFarcasterFrameContext(false);
      }
    };

    checkFarcasterContext();
  }, []);

  // Get projectId for wallet connections
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  if (!projectId) {
    console.error(
      "WalletConnect projectId is missing. Please check your environment variables."
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          chains={chains}
          theme={darkTheme({
            accentColor: "#7b3fe4",
            accentColorForeground: "white",
            borderRadius: "small",
            fontStack: "system",
            overlayBlur: "small",
          })}
          modalSize="compact"
          avatarSize={32} // Use numeric values instead of strings for dimensions
          iconSize={24} // Use numeric values instead of strings for dimensions
          onError={(error) => {
            // Only log non-extension related errors
            const errorStr = String(error.message || "");
            if (
              !errorStr.includes("runtime.sendMessage") &&
              !errorStr.includes("cross-origin") &&
              !errorStr.includes("farcaster")
            ) {
              console.error("RainbowKit error:", error);
            }
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
