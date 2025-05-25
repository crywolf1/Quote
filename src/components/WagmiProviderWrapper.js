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

  // Add this useEffect to improve mobile connection handling

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only run once on mount
    const attemptMobileConnection = async () => {
      try {
        // First check if we're on mobile
        const isMobile =
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );

        if (!isMobile) return; // Skip for desktop browsers

        console.log(
          "📱 Detected mobile device, setting up special connection handling"
        );

        // For Farcaster mobile, check for direct provider
        if (window.farcaster?.ethereum) {
          console.log("📱 Found Farcaster Wallet provider on mobile");
          try {
            // For Farcaster mobile app, try direct connection
            await window.farcaster.ethereum.request({
              method: "eth_requestAccounts",
            });
            console.log("✅ Connected via direct Farcaster provider on mobile");
            return;
          } catch (err) {
            console.log(
              "⚠️ Direct Farcaster connection failed on mobile:",
              err.message
            );
          }
        }

        // If on Warpcast mobile app
        if (navigator.userAgent.includes("Warpcast")) {
          console.log("📱 Detected Warpcast mobile app");
          // Wait longer for mobile initialization
          setTimeout(() => {
            // Try to trigger wallet connection via wagmiConfig
            wagmiConfig
              .autoConnect()
              .catch((e) => console.log("Mobile auto-connect error:", e));
          }, 1000);
        }
      } catch (error) {
        console.error("Mobile wallet detection error:", error);
      }
    };

    attemptMobileConnection();
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
      console.error = originalError; // Restore on unmount
    };
  }, []);

  // Safely check if we're in a Farcaster frame context
  // Update your existing useEffect for Farcaster context detection

  useEffect(() => {
    const checkFarcasterContext = async () => {
      try {
        // Check if we're on mobile first
        const isMobile =
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );

        // Use dynamic import to prevent SSR issues
        const { sdk } = await import("@farcaster/frame-sdk");

        // Mobile-specific detection logic
        if (isMobile) {
          console.log("📱 Checking Farcaster context on mobile...");
          // For mobile, check user agent more aggressively
          const mobileInFarcaster =
            navigator.userAgent.includes("Warpcast") ||
            document.referrer.includes("warpcast.com") ||
            window.farcaster != null;

          setIsFarcasterFrameContext(mobileInFarcaster);
          console.log("📱 Mobile Farcaster context:", mobileInFarcaster);
          return;
        }

        // Desktop detection remains the same
        const isFrameContext = sdk?.isFrameContext || false;
        const isInFarcaster =
          isFrameContext ||
          (typeof window !== "undefined" &&
            (window.farcaster != null ||
              window.__FARCASTER_FRAME_CONTEXT__ != null ||
              navigator.userAgent.includes("Warpcast") ||
              document.referrer.includes("warpcast.com")));

        setIsFarcasterFrameContext(isInFarcaster);
      } catch (e) {
        // SDK not available or not in frame context
        console.log("Farcaster context detection error:", e);
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
