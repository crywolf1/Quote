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

  // Mobile detection as a memoized value to avoid repetition
  const isMobileDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isMobileDevice) return;

    // Special handling for Rainbow and other wallets
    const setupWalletSpecificFixes = async () => {
      // For Rainbow Wallet specifically
      const isRainbowWallet =
        window.ethereum?.isRainbow ||
        localStorage
          .getItem("WALLETCONNECT_DEEPLINK_CHOICE")
          ?.includes("rainbow");

      if (isRainbowWallet) {
        console.log("🌈 Rainbow wallet detected - applying specific fixes");

        // Rainbow needs a special flag for proper connection
        window._rainbowWalletDetected = true;

        // Rainbow wallet connections need to be refreshed periodically
        const refreshRainbowConnection = async () => {
          try {
            if (window.ethereum?.isRainbow) {
              await window.ethereum.request({ method: "eth_requestAccounts" });
              console.log("🌈 Refreshed Rainbow wallet connection");
            }
          } catch (e) {
            // Silently fail - this is just a keepalive ping
          }
        };

        // Start a refresh interval
        const interval = setInterval(refreshRainbowConnection, 30000);
        return () => clearInterval(interval);
      }
    };

    setupWalletSpecificFixes();
  }, [isMobileDevice]);

  // Main mobile connection handler
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only run once on mount
    const attemptMobileConnection = async () => {
      try {
        if (!isMobileDevice) return; // Skip for desktop browsers

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

            // Extra check for Warpcast provider
            if (window.farcaster?.ethereum) {
              console.log(
                "📱 Found delayed Warpcast provider, attempting connection"
              );
              try {
                window.farcaster.ethereum.request({
                  method: "eth_requestAccounts",
                });
              } catch (e) {
                console.log("Delayed Warpcast connection error:", e);
              }
            }
          }, 1500); // Increased timeout for better reliability
        }
      } catch (error) {
        console.error("Mobile wallet detection error:", error);
      }
    };

    attemptMobileConnection();
  }, [isMobileDevice]);

  // Persistent reconnection for mobile - monitors when app regains focus
  useEffect(() => {
    if (typeof window === "undefined" || !isMobileDevice) return;

    console.log("📱 Setting up persistent mobile reconnection");

    // Handle visibility changes (user returning from wallet app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("📱 App returned to foreground, attempting reconnection");

        // Check for stored connection state
        const hasStoredConnection =
          localStorage.getItem("walletconnect") ||
          localStorage.getItem("wagmi.connected") ||
          localStorage.getItem("warpcast.connected");

        if (hasStoredConnection) {
          console.log("📱 Found stored connection, attempting to reconnect");
          wagmiConfig.autoConnect();
        }

        // Direct provider check
        if (window.farcaster?.ethereum) {
          try {
            window.farcaster.ethereum.request({
              method: "eth_requestAccounts",
            });
          } catch (err) {
            console.log("Visibility reconnection error:", err);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isMobileDevice]);

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

        // Mobile-specific detection logic
        if (isMobileDevice) {
          console.log("📱 Checking Farcaster context on mobile...");
          // For mobile, check user agent more aggressively
          const mobileInFarcaster =
            navigator.userAgent.includes("Warpcast") ||
            document.referrer.includes("warpcast.com") ||
            window.farcaster != null;

          setIsFarcasterFrameContext(mobileInFarcaster);
          console.log("📱 Mobile Farcaster context:", mobileInFarcaster);

          // Special case for Warpcast - needs extra time
          if (navigator.userAgent.includes("Warpcast")) {
            setTimeout(() => {
              if (window.farcaster?.ethereum) {
                setIsFarcasterFrameContext(true);
                console.log("📱 Delayed Warpcast context detection: true");
              }
            }, 1500);
          }

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
  }, [isMobileDevice]);

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
