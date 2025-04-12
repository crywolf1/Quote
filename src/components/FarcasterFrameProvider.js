"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");

  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.actions.getFrameContext();
        console.log("Farcaster Frame Context:", context);

        if (context?.fid || context?.address) {
          setUserData(context);
          setAuthStatus("authenticated");
        } else {
          setAuthStatus("guest");
        }
      } catch (error) {
        console.error("Error initializing Farcaster Frame SDK:", error);
        setAuthStatus("failed");
      }
    };

    initializeFarcaster();
  }, []);

  return (
    <FarcasterContext.Provider value={{ userData, authStatus }}>
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
