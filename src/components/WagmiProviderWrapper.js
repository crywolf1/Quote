"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useAccount } from "wagmi";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");
  const { address } = useAccount();

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // 1. Initialize Frame SDK
        await sdk.actions.ready();
        console.log("✅ Frame SDK ready");

        // 2. Get frame context for FID
        const context = await sdk.actions.getFrameContext();
        console.log("✅ Frame context:", context);

        // Try to get user data from frame context first
        if (context?.fid) {
          console.log("🎯 Found FID in frame context:", context.fid);
          const response = await fetch(`/api/neynar?fid=${context.fid}`);
          const data = await response.json();

          if (response.ok && data.users?.[0]) {
            const user = data.users[0];
            setUserData({
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
            setAuthStatus("authenticated");
            console.log("✅ User authenticated via frame:", user.username);
            return;
          }
        }

        // If no frame context, try wallet address
        if (address) {
          console.log("🔑 Trying wallet address:", address);
          const response = await fetch(`/api/neynar?address=${address}`);
          const data = await response.json();

          if (response.ok && data.users?.[0]) {
            const user = data.users[0];
            setUserData({
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
            setAuthStatus("authenticated");
            console.log("✅ User authenticated via wallet:", user.username);
            return;
          }
        }

        // If neither method worked, set to guest
        console.log("⚠️ No user data found, setting guest mode");
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
        setAuthStatus("guest");

      } catch (error) {
        console.error("❌ Auth error:", error);
        setAuthStatus("failed");
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };

    initializeSDK();
  }, [address]); // Add address as dependency to re-run when wallet connects

  const value = {
    userData,
    authStatus,
    isAuthenticated: authStatus === "authenticated",
  };

  return (
    <FarcasterContext.Provider value={value}>
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