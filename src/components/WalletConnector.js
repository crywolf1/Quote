"use client";

import { useFarcaster } from "./FarcasterFrameProvider"; // Assuming Farcaster manages the connection state
import { useAccount } from "wagmi"; // For wallet address, you can still use it for consistency
import { useState, useEffect } from "react";

export default function WalletConnector() {
  const { address, isConnected } = useAccount(); // Wagmi hook for wallet address
  const { userData, setUserData } = useFarcaster(); // Assuming Farcaster context manages user data

  const [isConnecting, setIsConnecting] = useState(false);

  // If Farcaster has a user data connection
  useEffect(() => {
    if (userData) {
      console.log("Farcaster user data:", userData);
    }
  }, [userData]);

  const connectWallet = () => {
    if (!isConnecting) {
      setIsConnecting(true);
      // Assuming FarcasterFrame has some function to connect wallet
      // Example: Farcaster connection flow (adjust this to match your actual Farcaster method)
      if (!isConnected) {
        // Trigger Farcaster wallet connection flow
        console.log("Initiating Farcaster connection...");
        // This part depends on the Farcaster SDK or flow you're using
        // Once connected, update the state (either with a hook or API response)
        // Example:
        // Farcaster.connectWallet();
      }
    }
  };

  if (isConnected || userData) {
    return <div>Connected as {address || userData?.username}</div>;
  }

  return (
    <button onClick={connectWallet} disabled={isConnecting}>
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
