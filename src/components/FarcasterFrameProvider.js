"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFrameContext, setIsFrameContext] = useState(false);

  // Wagmi hooks for wallet connection
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: injected(),
  });
  const { disconnect } = useDisconnect();

  // Function to connect wallet automatically or on button click
  const connectWallet = async () => {
    try {
      console.log("Attempting to connect wallet...");
      await connect();
      console.log("Wallet connected successfully");
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
      console.log("Initializing Frame SDK...");
      await sdk.actions.ready();
      setIsInitialized(true);
      console.log("SDK initialized successfully");

      // Try to get user context from Frame
      let fid = null;
      let userAddress = null;

      try {
        if (sdk.actions.getContext) {
          console.log("Getting frame context...");
          const context = await sdk.actions.getContext();
          console.log("Frame context:", context);

          if (context && context.fid) {
            fid = context.fid;
            userAddress = context.address;
            setIsFrameContext(true);
            console.log("Found frame context with FID:", fid);
          }
        }
      } catch (contextError) {
        console.warn("Error getting frame context:", contextError);
      }

      // If no FID or address from context, use connected wallet address
      if (!fid && !userAddress && address) {
        userAddress = address;
        console.log("Using connected wallet address:", userAddress);
      } else if (!fid && !userAddress && !address) {
        console.log(
          "No context found and no wallet connected. Attempting to connect wallet..."
        );
        const connected = await connectWallet();
        if (connected && address) {
          userAddress = address;
          console.log("Wallet now connected. Using address:", userAddress);
        } else {
          throw new Error(
            "Unable to retrieve user data - please connect wallet"
          );
        }
      }

      // Try to fetch by FID first (more reliable)
      if (fid) {
        console.log("Fetching user data by FID:", fid);
        const fidRes = await fetch(`/api/neynar?fid=${fid}`);
        if (!fidRes.ok) {
          console.error("API error when fetching by FID:", await fidRes.text());
          throw new Error("Error fetching user data by FID");
        }

        const fidData = await fidRes.json();
        console.log("FID data response:", fidData);

        if (fidData.users && fidData.users.length) {
          const user = fidData.users[0];
          console.log("User data retrieved by FID:", user);
          setUserData({
            username: user.username || "Anonymous",
            displayName: user.display_name || user.username || "Anonymous",
            pfpUrl: user.pfp_url || "/default-avatar.jpg",
            fid: user.fid,
            followerCount: user.follower_count || 0,
            followingCount: user.following_count || 0,
            profile: user.profile || {},
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
        if (!addrRes.ok) {
          console.error(
            "API error when fetching by address:",
            await addrRes.text()
          );
          throw new Error("Error fetching user data by address");
        }

        const addrData = await addrRes.json();
        console.log("Address data response:", addrData);

        if (addrData.users && addrData.users.length) {
          const user = addrData.users[0];
          console.log("User data retrieved by address:", user);
          setUserData({
            username: user.username || "Anonymous",
            displayName: user.display_name || user.username || "Anonymous",
            pfpUrl: user.pfp_url || "/default-avatar.jpg",
            fid: user.fid,
            followerCount: user.follower_count || 0,
            followingCount: user.following_count || 0,
            profile: user.profile || {},
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
      setError(error.message || "Connect your Farcaster account to continue");
      setLoading(false);
      return false;
    }
  };

  // Initial setup - try to get user data when component mounts
  useEffect(() => {
    const initializeApp = async () => {
      // First try to connect wallet if not already connected
      if (!isConnected) {
        await connectWallet();
      }
      // Then try to get user data
      await tryGetUserData();
    };

    initializeApp();
  }, []);

  // When wallet address changes, try to get user data again
  useEffect(() => {
    if (isConnected && address) {
      console.log("Wallet address changed or connected. Fetching user data...");
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
        isFrameContext,
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
