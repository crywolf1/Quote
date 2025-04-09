"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log("SDK is ready");
        const context = sdk.context;
        console.log("Full SDK Context:", context);
        if (context?.user) {
          setUserData({
            username: context.user.username,
            pfpUrl: context.user.pfpUrl || "/default-avatar.jpg",
          });
          console.log("User data set:", context.user);
        } else {
          console.warn("No user data found in sdk.context");
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
