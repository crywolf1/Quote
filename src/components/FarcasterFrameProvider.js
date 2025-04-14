"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log("✅ Farcaster SDK ready");
        setIsInitialized(true);

        const context = await sdk.getContext();
        console.log("Frame context:", context);

        if (context?.fid) {
          try {
            const response = await fetch(
              `/api/neynar/neynar?fid=${context.fid}`
            );
            const result = await response.json();

            if (response.ok && result.users?.[0]) {
              const user = result.users[0];
              setUserData({
                username: user.display_name || user.username,
                pfpUrl: user.pfp_url,
                fid: user.fid,
                followerCount: user.follower_count,
                followingCount: user.following_count,
                profile: user.profile,
                verifiedAddresses: user.verified_addresses,
              });
              console.log("✅ User data set from Neynar:", user);
            } else {
              throw new Error("Invalid user data from Neynar");
            }
          } catch (error) {
            console.error("❌ Neynar API error:", error);
            setUserData({
              username: `fid:${context.fid}`,
              pfpUrl: "/default-avatar.jpg",
              fid: context.fid,
            });
          }
        } else {
          console.warn("No FID in context");
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("❌ SDK error:", error);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };

    initializeSDK();
  }, []);

  return (
    <FarcasterContext.Provider value={{ userData, isInitialized }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
