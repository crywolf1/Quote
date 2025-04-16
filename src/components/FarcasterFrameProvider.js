"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useSearchParams } from "next/navigation";

const FarcasterContext = createContext();

export const useFarcaster = () => useContext(FarcasterContext);

export const FarcasterFrameProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
<<<<<<< HEAD
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
=======
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
>>>>>>> 6dc8b554356b6fab4e306f5f295421b471a117c4

  useEffect(() => {
    const initFarcaster = async () => {
      try {
        

        // Always call .ready() to allow the mini app to work inside Farcaster
        await sdk.actions.ready();
<<<<<<< HEAD
        setIsInitialized(true);

        const context = await sdk.actions.getFrameContext();

        if (context?.fid) {
          try {
            const response = await fetch(`/api/neynar?fid=${context.fid}`);
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
              username: `fid:${context.fid}`,
              pfpUrl: "/default-avatar.jpg",
              fid: context.fid,
            });
            setError("Failed to fetch user data from Neynar.");
          }
        } else if (context?.address) {
          try {
            const response = await fetch(
              `/api/neynar?address=${context.address}`
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
=======

        const frameContext = await sdk.getFrameContext();

        const fid = frameContext?.message?.cast?.fid;
        if (!fid) {
          console.warn("FID not found in frame context");
          setUserData(null);
          setLoading(false);
          return;
        }

        // Fetch user data from backend Neynar proxy API
        const res = await fetch(`/api/neynar?fid=${fid}`);
        const data = await res.json();

        if (!res.ok) {
          console.error("Failed to fetch user from Neynar:", data.error);
          setUserData(null);
>>>>>>> 6dc8b554356b6fab4e306f5f295421b471a117c4
        } else {
          setUserData({
            username: data.username,
            pfpUrl: data.pfp_url, // Make sure this key exists
          });
        }
<<<<<<< HEAD
      } catch (error) {
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
        setError("Failed to initialize Farcaster SDK.");
=======
      } catch (err) {
        console.error("Farcaster SDK init error:", err);
        setUserData(null);
>>>>>>> 6dc8b554356b6fab4e306f5f295421b471a117c4
      } finally {
        setLoading(false);
      }
    };

    initFarcaster();
  }, []);

  return (
<<<<<<< HEAD
    <FarcasterContext.Provider
      value={{ userData, isInitialized, loading, error }}
    >
=======
    <FarcasterContext.Provider value={{ userData, loading }}>
>>>>>>> 6dc8b554356b6fab4e306f5f295421b471a117c4
      {children}
    </FarcasterContext.Provider>
  );
};