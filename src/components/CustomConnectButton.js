"use client";

import { useState, useEffect } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import "../styles/CustomConnectButton.css";

export default function CustomConnectButton() {
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isWarpcast, setIsWarpcast] = useState(false);
  const [farcasterSDK, setFarcasterSDK] = useState(null);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  // Enhanced Farcaster environment detection
  const detectFarcasterEnvironment = () => {
    if (typeof window === "undefined") return false;

    // Method 1: Check for Farcaster SDK isFrameContext
    if (farcasterSDK?.isFrameContext) return true;

    // Method 2: Check for Farcaster object in window
    if (window.farcaster) return true;

    // Method 3: Check for Farcaster context in window
    if (window.__FARCASTER_FRAME_CONTEXT__) return true;

    // Method 4: Check user agent for Warpcast
    if (navigator.userAgent.includes("Warpcast")) return true;

    // Method 5: Check referrer
    if (document.referrer && document.referrer.includes("warpcast.com"))
      return true;

    // Method 6: Check if in iframe (common for Frames)
    try {
      if (window.parent && window.parent !== window) return true;
    } catch (e) {
      // Ignore cross-origin errors
    }

    return false;
  };

  // Safely load Farcaster SDK and detect environment
  useEffect(() => {
    const loadSDK = async () => {
      try {
        console.log("Loading Farcaster SDK...");
        const { sdk } = await import("@farcaster/frame-sdk");
        setFarcasterSDK(sdk);

        const isInFarcaster = detectFarcasterEnvironment();
        console.log("Is in Farcaster environment:", isInFarcaster);
        setIsWarpcast(isInFarcaster);

        // Auto-connect if in Farcaster
        if (isInFarcaster && !connectionAttempted && !isConnected) {
          console.log("Auto-connecting in Farcaster environment...");
          attemptFarcasterConnection(sdk);
        }
      } catch (e) {
        console.log("Farcaster SDK loading error:", e);
      }
    };

    if (typeof window !== "undefined") {
      // Check if mobile
      const checkMobile = () => {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      };

      setIsMobileDevice(checkMobile());
      loadSDK();
    }
  }, [isConnected, connectionAttempted]);

  // Function to attempt connection with retries
  const attemptFarcasterConnection = async (sdk) => {
    setConnectionAttempted(true);

    // Try up to 3 times with increasing delays
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`Connection attempt ${attempt + 1}...`);

        // Check for Farcaster wallet provider
        if (sdk?.wallet?.ethProvider) {
          console.log("Found Farcaster wallet provider, connecting...");
          await sdk.wallet.ethProvider.request({
            method: "eth_requestAccounts",
          });
          console.log("Successfully connected to Farcaster wallet!");
          return true;
        } else if (window.farcaster?.ethereum) {
          console.log("Found window.farcaster.ethereum, connecting...");
          await window.farcaster.ethereum.request({
            method: "eth_requestAccounts",
          });
          console.log(
            "Successfully connected using window.farcaster.ethereum!"
          );
          return true;
        } else {
          console.log("No Farcaster wallet provider available in this attempt");
        }
      } catch (error) {
        console.error(`Connection attempt ${attempt + 1} failed:`, error);
      }

      // Wait before next attempt (increasing delay)
      if (attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1))
        );
      }
    }

    console.log("All auto-connection attempts failed");
    return false;
  };

  // Manual connection handler for button click
  const handleConnect = async () => {
    // If in Warpcast with SDK available, use Farcaster's wallet
    if (isWarpcast) {
      const connected = await attemptFarcasterConnection(farcasterSDK);
      if (connected) return;
    }

    // For mobile, try direct deep linking first
    if (isMobileDevice) {
      // Try opening Rainbow directly
      window.location.href = "https://rnbwapp.com/";

      // After a short delay, open the modal as fallback
      setTimeout(() => {
        openConnectModal?.();
      }, 1500);
    } else {
      // On desktop, use normal modal
      openConnectModal?.();
    }
  };

  return (
    <button onClick={handleConnect} className="connect-button">
      Sign in
    </button>
  );
}
