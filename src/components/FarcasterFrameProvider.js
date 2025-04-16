"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Wagmi hooks for wallet connection
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });
  const { disconnect } = useDisconnect();

  // Function to connect wallet automatically or on button click
  const connectWallet = async () => {
    try {
      await connect();
      return true;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setError("Failed to connect wallet. Please try again.");
      return false;
    }
  };

  // Try to get user data from Farcaster context or by wallet address
  const tryGetUserData = async () => {
    setLoading(true);
    setError("");

    try {
      // Initialize Frame SDK
      await sdk.actions.ready();
      setIsInitialized(true);

      console.log("SDK initialized successfully");

      // Try to get user context from Frame
      let fid = null;
      let userAddress = null;

      try {
        if (sdk.actions.getContext) {
          const context = await sdk.actions.getContext();
          console.log("Frame context:", context);

          if (context) {
            fid = context.fid;
            userAddress = context.address;
          }
        }
      } catch (contextError) {
        console.warn("Error getting frame context:", contextError);
      }

      // If no FID or address from context, use connected wallet address
      if (!fid && !userAddress) {
        userAddress = address;
        console.log("Using connected wallet address:", userAddress);
      }

      // Try to fetch by FID first (more reliable)
      if (fid) {
        console.log("Fetching user data by FID:", fid);
        const fidRes = await fetch(`/api/neynar?fid=${fid}`);
        const fidData = await fidRes.json();

        if (fidRes.ok && fidData.users && fidData.users.length) {
          const user = fidData.users[0];
          setUserData({
            username: user.username || "Anonymous",
            displayName: user.display_name || user.username || "Anonymous",
            pfpUrl: user.pfp_url || "/default-avatar.jpg",
            fid: user.fid,
          });
          setLoading(false);
          return true;
        }
      }

      // If no data from FID or no FID available, try by address
      if (userAddress) {
        console.log("Fetching user data by address:", userAddress);
        const addrRes = await fetch(
          `/api/neynar?address=${userAddress.toLowerCase()}`
        );
        const addrData = await addrRes.json();

        if (addrRes.ok && addrData.users && addrData.users.length) {
          const user = addrData.users[0];
          setUserData({
            username: user.username || "Anonymous",
            displayName: user.display_name || user.username || "Anonymous",
            pfpUrl: user.pfp_url || "/default-avatar.jpg",
            fid: user.fid,
          });
          setLoading(false);
          return true;
        }
      }

      // If we reach here, no user data was found
      throw new Error("No Farcaster account found");
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData({
        username: "Guest",
        pfpUrl: "/default-avatar.jpg",
      });
      setError("Connect your Farcaster account to continue");
      setLoading(false);
      return false;
    }
  };

  // Initial setup - try to get user data when component mounts
  useEffect(() => {
    tryGetUserData();
  }, []);

  // When wallet address changes, try to get user data again
  useEffect(() => {
    if (isConnected && address) {
      tryGetUserData();
    }
  }, [address, isConnected]);

  return (
    <FarcasterContext.Provider
      value={{
        userData,
        isInitialized,
        loading,
        error,
        connectWallet,
        disconnect,
        tryGetUserData,
        isConnected,
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
