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
  const [isFrameReady, setIsFrameReady] = useState(false);

  useEffect(() => {
    const initializeSDK = async () => {
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Frame SDK initialization timed out")),
          5000
        )
      );

      try {
        await Promise.race([sdk.actions.ready(), timeout]);
        console.log("✅ Frame SDK ready");
        setIsFrameReady(true);

        // Try frame context first
        const context = await sdk.actions.getFrameContext();
        console.log("🔄 Frame context:", context);

        if (context?.fid) {
          await handleFarcasterUser(context.fid);
          return;
        } else {
          console.warn(
            "⚠️ No Frame context found. Falling back to wallet authentication."
          );
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
      } else {
        console.warn("⚠️ No user found for the provided FID.");
        setAuthStatus("guest");
      }
    } catch (error) {
      console.error("❌ Farcaster auth error:", error);
      setAuthStatus("failed");
    }
  };

  const handleWalletUser = async (walletAddress) => {
    try {
      const response = await fetch(`/api/neynar?address=${walletAddress}`);
      const data = await response.json();

      if (response.ok && data.users?.[0]) {
        setUserData(formatUserData(data.users[0]));
        setAuthStatus("authenticated");
      } else {
        console.warn("⚠️ No user found for the provided wallet address.");
        setAuthStatus("guest");
      }
    } catch (error) {
      console.error("❌ Wallet auth error:", error);
      setAuthStatus("failed");
    }
  };

  const formatUserData = (user) => ({
    username: user.username || "Unknown",
    displayName: user.display_name || "Unknown",
    pfpUrl: user.pfp_url || "/default-avatar.jpg",
    fid: user.fid || null,
    profile: {
      bio: user.profile?.bio || "",
    },
    followerCount: user.follower_count || 0,
    followingCount: user.following_count || 0,
    verifiedAddresses: user.verified_addresses || [],
  });

  useEffect(() => {
    if (authStatus === "failed") {
      console.error(
        "⚠️ Authentication failed. Check the Frame SDK or API configuration."
      );
    }
  }, [authStatus]);

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
