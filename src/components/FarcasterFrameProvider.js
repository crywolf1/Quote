"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FrameSDK } from "@farcaster/auth-kit";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const sdk = new FrameSDK();
        await sdk.init();
        const frameContext = sdk.context;

        if (!frameContext?.fid) {
          throw new Error("FID not available");
        }

        const fid = frameContext.fid;
        const response = await fetch(`/api/neynar?fid=${fid}`);
        const data = await response.json();

        if (data?.username) {
          setUserData({
            username: data.username,
            displayName: data.displayName,
            pfpUrl: data.pfpUrl,
            fid: data.fid,
          });
        } else {
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("Failed to fetch user data", error);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };

    init();
  }, []);

  return (
    <FarcasterContext.Provider value={{ userData }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
