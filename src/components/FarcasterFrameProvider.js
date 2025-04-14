"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useSearchParams } from "next/navigation";

const FarcasterContext = createContext();

export const useFarcaster = () => useContext(FarcasterContext);

export const FarcasterFrameProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const initFarcaster = async () => {
      try {
        

        // Always call .ready() to allow the mini app to work inside Farcaster
        await sdk.actions.ready();

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
        } else {
          setUserData({
            username: data.username,
            pfpUrl: data.pfp_url, // Make sure this key exists
          });
        }
      } catch (err) {
        console.error("Farcaster SDK init error:", err);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    initFarcaster();
  }, []);

  return (
    <FarcasterContext.Provider value={{ userData, loading }}>
      {children}
    </FarcasterContext.Provider>
  );
};