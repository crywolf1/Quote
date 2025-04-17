"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [sdk, setSdk] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { address, isConnected } = useAccount();
  const { connect } = useConnect({ connector: injected() });
  const { disconnect } = useDisconnect();

  // Dynamically import Farcaster SDK on client side
  useEffect(() => {
    async function loadSdk() {
      if (typeof window !== "undefined") {
        try {
          const module = await import("@farcaster/frame-sdk");
          setSdk(module.sdk);
        } catch (err) {
          console.error("Failed to load Farcaster SDK:", err);
        }
      }
    }
    loadSdk();
  }, []);

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

  const tryGetUserData = async () => {
    if (!sdk) return;

    setLoading(true);
    setError("");

    try {
      await sdk.actions.ready();
      setIsInitialized(true);
      console.log("SDK initialized");

      let fid = null;
      let userAddress = null;

      try {
        const context = await sdk.actions.getContext?.();
        console.log("Frame context:", context);
        if (context) {
          fid = context.fid;
          userAddress = context.address;
        }
      } catch (contextError) {
        console.warn("Error getting frame context:", contextError);
      }

      // Try by FID
      if (fid) {
        console.log("Fetching user data by FID:", fid);
        const fidRes = await fetch(`/api/neynar?fid=${fid}`);
        const fidData = await fidRes.json();

        if (fidRes.ok && fidData.users?.length) {
          const user = fidData.users[0];
          setUserData({
            username: user.username || "Anonymous",
            displayName: user.display_name || user.username || "Anonymous",
            pfpUrl: user.pfp_url || "/default-avatar.jpg",
            fid: user.fid,
            followerCount: user.follower_count || 0,
            followingCount: user.following_count || 0,
          });
          setLoading(false);
          return true;
        }
      }

      // Try by wallet address
      if (address) {
        const userAddress = address.toLowerCase();
        console.log("Fetching user data by wallet:", userAddress);
        const addrRes = await fetch(`/api/neynar?address=${userAddress}`);
        const addrData = await addrRes.json();

        if (addrRes.ok && addrData.users?.length) {
          const user = addrData.users[0];
          setUserData({
            username: user.username || "Anonymous",
            displayName: user.display_name || user.username || "Anonymous",
            pfpUrl: user.pfp_url || "/default-avatar.jpg",
            fid: user.fid,
            followerCount: user.follower_count || 0,
            followingCount: user.following_count || 0,
          });
          setLoading(false);
          return true;
        }
      }

      throw new Error("No Farcaster account found");
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData({
        username: "Guest",
        displayName: "Guest",
        pfpUrl: "/default-avatar.jpg",
        fid: null,
        followerCount: 0,
        followingCount: 0,
      });
      setError("Connect your Farcaster account to continue");
      setLoading(false);
      return false;
    }
  };

  // Fetch user data once SDK is ready
  useEffect(() => {
    if (sdk) {
      tryGetUserData();
    }
  }, [sdk]);

  // Re-fetch user data on wallet change
  useEffect(() => {
    if (isConnected && address && sdk) {
      tryGetUserData();
    }
  }, [address, isConnected, sdk]);

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
