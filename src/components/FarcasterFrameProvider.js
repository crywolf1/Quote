"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Initialize Farcaster SDK
        await sdk.actions.ready();
        console.log("Farcaster SDK ready");

        // Get frame context
        const context = await sdk.getContext();
        console.log("Frame context:", context);

        if (context && context.fid) {
          // Fetch user data from our Neynar API route
          const response = await fetch(`/api/neynar/neynar?fid=${context.fid}`);
          const data = await response.json();

          if (response.ok) {
            setUserData({
              username: data.username || `fid:${context.fid}`,
              pfpUrl: data.pfpUrl || "/default-avatar.jpg",
              fid: context.fid,
            });
            console.log("User data set:", data);
          } else {
            console.warn("Failed to fetch user data:", data.error);
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
        console.error("SDK initialization failed:", error);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };

    initializeSDK();
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
