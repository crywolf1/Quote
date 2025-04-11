"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      if (!sdk) {
        console.error("Farcaster SDK not found");
        return;
      }

      try {
        // Initialize the Farcaster SDK
        await sdk.actions.ready();
        console.log("Farcaster SDK initialized");

        // Access the context directly (using context, not getContext)
        const context = sdk.context;
        console.log("Frame context:", { fid: context?.fid });

        if (!context?.fid) {
          throw new Error("No FID available in frame context");
        }

        // Log the FID before making the API call
        console.log("Context FID:", context.fid);

        // Fetch user data from the API route
        const apiUrl = `${window.location.origin}/api/neynar?fid=${context.fid}`;
        console.log("Fetching from:", apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("API response data:", data);

        // Store user data in state
        if (data.username && data.pfpUrl) {
          setUserData({
            username: data.username,
            pfpUrl: data.pfpUrl,
            fid: context.fid,
          });
        } else {
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error.message);
        // Set fallback data on error
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
