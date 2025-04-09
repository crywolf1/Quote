// ./src/components/FarcasterFrameProvider.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk"; // Correct package

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Initialize the SDK and signal readiness
        await sdk.actions.ready();
        console.log("SDK is ready"); // Debug log

        // Optional: Fetch user data if your app needs it
        // const user = await sdk.signin();
        // setUserData({
        //   username: user.username || "Guest",
        //   pfpUrl: user.pfpUrl || "/default-avatar.jpg",
        // });
        setUserData({ username: "Guest", pfpUrl: "/default-avatar.jpg" }); // Placeholder
      } catch (error) {
        console.error("SDK initialization failed:", error);
        setUserData({ username: "Guest", pfpUrl: "/default-avatar.jpg" });
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
