"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useAccount, useSignMessage } from "wagmi";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");
  const { address, isConnected } = useAccount();
  const { signMessage } = useSignMessage();

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Initialize Frame SDK
        await sdk.actions.ready();
        console.log("✅ Frame SDK ready");

        // Try frame context first
        const context = await sdk.actions.getFrameContext();
        console.log("🔄 Frame context:", context);

        if (context?.fid) {
          await handleFarcasterUser(context.fid);
          return;
        }

        // Try wallet auth if no frame context
        if (isConnected && address) {
          await handleWalletUser(address);
          return;
        }

        setAuthStatus("guest");
        setUserData({ username: "Guest", pfpUrl: "/default-avatar.jpg" });
      } catch (error) {
        console.error("❌ Auth error:", error);
        setAuthStatus("failed");
      }
    };

    initializeSDK();
  }, [address, isConnected]);

  const handleFarcasterUser = async (fid) => {
    try {
      const response = await fetch(`/api/neynar?fid=${fid}`);
      const data = await response.json();

      if (response.ok && data.users?.[0]) {
        setUserData(formatUserData(data.users[0]));
        setAuthStatus("authenticated");
      }
    } catch (error) {
      console.error("❌ Farcaster auth error:", error);
      throw error;
    }
  };

  const handleWalletUser = async (walletAddress) => {
    try {
      const response = await fetch(`/api/neynar?address=${walletAddress}`);
      const data = await response.json();

      if (response.ok && data.users?.[0]) {
        setUserData(formatUserData(data.users[0]));
        setAuthStatus("authenticated");
      }
    } catch (error) {
      console.error("❌ Wallet auth error:", error);
      throw error;
    }
  };

  const formatUserData = (user) => ({
    username: user.username,
    displayName: user.display_name,
    pfpUrl: user.pfp_url,
    fid: user.fid,
    profile: {
      bio: user.profile?.bio,
    },
    followerCount: user.follower_count,
    followingCount: user.following_count,
    verifiedAddresses: user.verified_addresses,
  });

  return (
    <FarcasterContext.Provider
      value={{
        userData,
        authStatus,
        isAuthenticated: authStatus === "authenticated",
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  const context = useContext(FarcasterContext);
  if (!context) {
    throw new Error("useFarcaster must be used within FarcasterFrameProvider");
  }
  return context;
}
