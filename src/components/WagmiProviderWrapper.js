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

  // Detect Farcaster frame context on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isFarcasterEnv =
        window.__FARCASTER_FRAME_CONTEXT__ ||
        navigator.userAgent.includes("Warpcast") ||
        document.referrer.includes("warpcast.com") ||
        (window.parent && window.parent !== window);

      setIsFarcasterFrameContext(isFarcasterEnv);

      // If in Farcaster environment, ensure the provider is set
      if (isFarcasterEnv && window.farcaster?.ethereum) {
        console.log(
          "Setting Farcaster ethereum provider in WagmiProviderWrapper"
        );
        window._originalEthereum = window._originalEthereum || window.ethereum;
        window.ethereum = window.farcaster.ethereum;
      }
    }
  }, []);

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
      console.error = originalError; // Restore original function on unmount
    };
  }, []);

  // Additional effect to monitor visibility changes and provider availability
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkFarcasterProvider = () => {
      // If we're in a Farcaster environment and the provider becomes available
      if (isFarcasterFrameContext && window.farcaster?.ethereum) {
        // Ensure Farcaster's provider is used
        if (window.ethereum !== window.farcaster.ethereum) {
          window._originalEthereum =
            window._originalEthereum || window.ethereum;
          window.ethereum = window.farcaster.ethereum;
          console.log("Visibility change: Using Farcaster ethereum provider");
        }
      }
    };

    // Check when visibility changes (app comes to foreground)
    document.addEventListener("visibilitychange", checkFarcasterProvider);

    // Also check periodically (providers can load asynchronously)
    const interval = setInterval(checkFarcasterProvider, 3000);

    return () => {
      document.removeEventListener("visibilitychange", checkFarcasterProvider);
      clearInterval(interval);
    };
  }, [isFarcasterFrameContext]);

  // WagmiProvider with suppressed error output
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
          avatarSize={32}
          iconSize={24}
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
