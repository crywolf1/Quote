// src/components/FarcasterFrameProvider.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await sdk.actions.ready(); // 🔑 Required for Frames to load
        const context = sdk.context;

        console.log("Farcaster context:", context);

        if (!context?.fid) {
          throw new Error("FID not found in context");
        }

        const response = await fetch(
          `${window.location.origin}/api/neynar?fid=${context.fid}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }

        const data = await response.json();
        console.log("User data from API:", data);

        setUserData({
          fid: context.fid,
          username: data.username || "Guest",
          pfpUrl: data.pfpUrl || "/default-avatar.jpg",
        });
      } catch (err) {
        console.error("Farcaster SDK error:", err);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };

    initialize();
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
