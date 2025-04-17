// components/WalletConnector.js
"use client";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect } from "react";

export default function WalletConnector({ setWalletAddress }) {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
    }
  }, [address, isConnected, setWalletAddress]);

  return <ConnectButton />;
}
