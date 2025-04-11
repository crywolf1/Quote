"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      console.log("Starting SDK initialization...");

      try {
        // Check if we're in Warpcast environment
        const isInWarpcast = window?.parent !== window;
        console.log("Is in Warpcast:", isInWarpcast);

        // Initialize Farcaster SDK with debug info
        console.log("Attempting SDK ready...");
        await sdk.actions.ready();
        console.log("✅ Farcaster SDK ready");

        // Get frame context with debug info
        console.log("Attempting to get context...");
        const context = await sdk.getContext();
        console.log("Frame context received:", context);

        if (context && context.fid) {
          console.log(`Found FID: ${context.fid}, fetching user data...`);

          // Log the API endpoint we're calling
          const apiUrl = `/api/neynar/neynar?fid=${context.fid}`;
          console.log("Calling API endpoint:", apiUrl);

          try {
            const response = await fetch(apiUrl);
            console.log("API response status:", response.status);

            const data = await response.json();
            console.log("API response data:", data);

            if (response.ok) {
              const userData = {
                username: data.username || `fid:${context.fid}`,
                pfpUrl: data.pfpUrl || "/default-avatar.jpg",
                fid: context.fid,
              };
              console.log("Setting user data:", userData);
              setUserData(userData);
            } else {
              throw new Error(data.error || "Failed to fetch user data");
            }
          } catch (apiError) {
            console.error("API call failed:", apiError);
            setError(`API Error: ${apiError.message}`);
            setUserData({
              username: `fid:${context.fid}`,
              pfpUrl: "/default-avatar.jpg",
              fid: context.fid,
            });
          }
        } else {
          console.warn("No FID found in context");
          setError("No FID in context");
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("SDK initialization error:", error);
        setError(`SDK Error: ${error.message}`);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };

    initializeSDK();
  }, []);

  // Debug render
  console.log("Current userData state:", userData);
  console.log("Current error state:", error);

  return (
    <FarcasterContext.Provider value={{ userData, error }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
