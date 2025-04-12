"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { getSignInMessage } from "@farcaster/auth-kit";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // 1. Initialize Frame SDK
        await sdk.actions.ready();
        console.log("✅ Frame SDK ready");

        // 2. Get frame context for FID
        const context = await sdk.actions.getFrameContext();
        console.log("✅ Frame context:", context);

        if (!context?.fid) {
          throw new Error("No FID in frame context");
        }

        // 3. Get sign-in message
        const message = await getSignInMessage({
          fid: context.fid,
          siweUri: "https://quote-production-679a.up.railway.app",
          domain: "quote-production-679a.up.railway.app",
        });
        console.log("✅ Sign message generated");

        // 4. Fetch user data from Neynar
        const apiUrl = `/api/neynar?fid=${context.fid}`; // Changed to relative URL
        console.log("🔍 Fetching user data:", apiUrl);

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(`Neynar API error: ${data.error || response.status}`);
        }

        // 5. Set authenticated user data - Updated to match new response structure
        if (data.users?.[0]) {
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
          console.log(
            "✅ User authenticated:",
            user.display_name || user.username
          );
        } else {
          throw new Error("Invalid user data structure");
        }
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
  }, []);

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
