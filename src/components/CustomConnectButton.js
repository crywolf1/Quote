"use client";

import { useState, useEffect } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useConnect } from "wagmi";
import { FaSpinner } from "react-icons/fa";

export default function CustomConnectButton() {
  const { openConnectModal } = useConnectModal();
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  // Add this effect to detect Farcaster environment and auto-connect
  useEffect(() => {
    const detectFarcasterEnvironment = () => {
      if (typeof window === "undefined") return false;

      return !!(
        window.farcaster ||
        window.__FARCASTER_FRAME_CONTEXT__ ||
        navigator.userAgent.includes("Warpcast") ||
        document.referrer.includes("warpcast.com")
      );
    };

    const isFarcasterEnv = detectFarcasterEnvironment();

    if (isFarcasterEnv && !connectionAttempted && !isConnected) {
      handleConnect();
    }

    if (typeof window !== "undefined") {
      setIsMobileDevice(
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      );
    }
  }, [isConnected, connectionAttempted]);

  // Function to handle connection with proper state updates
  const handleConnect = async () => {
    setIsLoading(true);
    setConnectionAttempted(true);

    try {
      // First try Farcaster connection
      if (window.farcaster?.ethereum) {
        console.log("Found Farcaster wallet provider, connecting...");

        try {
          await window.farcaster.ethereum.request({
            method: "eth_requestAccounts",
          });
          console.log("Successfully connected to Farcaster wallet!");

          // Force update wagmi state for React rendering
          const farcasterConnector = connectors.find(
            (c) =>
              c.id === "farcasterFrame" ||
              c.name?.toLowerCase().includes("farcaster")
          );

          if (farcasterConnector) {
            await connect({ connector: farcasterConnector });
          }

          // Wait for next tick to allow state to update
          setTimeout(() => {
            window.location.reload(); // Force refresh as last resort
          }, 1000);

          return;
        } catch (err) {
          console.error("Farcaster connection error:", err);
        }
      }

      // Fallback to modal for non-Farcaster environments
      if (isMobileDevice) {
        window.location.href = "https://rnbwapp.com/";
        setTimeout(() => {
          openConnectModal?.();
        }, 1500);
      } else {
        openConnectModal?.();
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="connect-button"
    >
      {isLoading ? (
        <span className="loading-state">
          <FaSpinner className="spin" /> Connecting...
        </span>
      ) : isConnected ? (
        <span className="connected-state">Connected</span>
      ) : (
        <span className="connect-state">Sign in</span>
      )}
    </button>
  );
}
