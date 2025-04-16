"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useAccount } from "wagmi"; // <-- add this

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { address } = useAccount(); // <-- add this

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        await sdk.actions.ready();
        setIsInitialized(true);

        const context = await sdk.actions.getFrameContext();

        if (context?.fid) {
          // ...existing FID logic...
        } else if (context?.address || address) {
          // <-- use address from wagmi if context.address is not set
          const userAddress = context?.address || address;
          try {
            const response = await fetch(`/api/neynar?address=${userAddress}`);
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
            } else {
              throw new Error("Invalid user data from Neynar");
            }
          } catch (error) {
            setUserData({
              username: "Unknown User",
              pfpUrl: "/default-avatar.jpg",
            });
            setError("Failed to fetch user data from Neynar.");
          }
        } else {
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
        setError("Failed to initialize Farcaster SDK.");
      } finally {
        setLoading(false);
      }
    };

    initializeSDK();
  }, [address]); // <-- add address here

  return (
    <FarcasterContext.Provider
      value={{ userData, isInitialized, loading, error }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}
export function useFarcaster() {
  return useContext(FarcasterContext);
}
