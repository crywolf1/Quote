"use client";

import { useState, useEffect } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import "../styles/CustomConnectButton.css";

export default function CustomConnectButton() {
  const { openConnectModal } = useConnectModal();
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isWarpcast, setIsWarpcast] = useState(false);
  const [farcasterSDK, setFarcasterSDK] = useState(null);

  // Safely load Farcaster SDK on client side
  useEffect(() => {
    const loadSDK = async () => {
      try {
        const { sdk } = await import("@farcaster/frame-sdk");
        setFarcasterSDK(sdk);

        if (sdk?.isFrameContext) {
          setIsWarpcast(true);
        }
      } catch (e) {
        console.log("Farcaster SDK not available", e);
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
  }, []);

  const handleConnect = async () => {
    // If in Warpcast with SDK available, use Farcaster's wallet
    if (isWarpcast && farcasterSDK?.wallet?.ethProvider) {
      try {
        await farcasterSDK.wallet.ethProvider.request({
          method: "eth_requestAccounts",
        });
        return;
      } catch (error) {
        console.error("Warpcast connection error:", error);
      }
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
