// ./src/components/FarcasterFrameProvider.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk"; // Ensure this is installed

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Initialize the SDK
        await sdk.actions.ready();
        console.log("SDK is ready");

        // Authenticate the user
        const user = await sdk.signin();
        console.log("User signed in:", user); // Debug log

        // Set user data from the authenticated user
        setUserData({
          username: user.username || "Guest",
          pfpUrl: user.pfpUrl || "/default-avatar.jpg",
        });
      } catch (error) {
        console.error("SDK initialization or sign-in failed:", error);
        // Fallback to Guest if authentication fails
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
