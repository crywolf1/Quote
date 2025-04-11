"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeSDK = async () => {
      if (!sdk) {
        console.error("Farcaster SDK not found");
        setError("SDK not available");
        return;
      }

      try {
        await sdk.actions.ready();
        console.log("✅ Farcaster SDK ready");
        setIsInitialized(true);

        const context = await sdk.getContext();
        console.log("Frame context:", { context, hasFid: !!context?.fid });

        if (context?.fid) {
          const baseUrl = window.location.origin;
          const apiUrl = `${baseUrl}/api/neynar/neynar?fid=${context.fid}`;
          console.log("API call:", { apiUrl });

          const response = await fetch(apiUrl);
          console.log("API response:", {
            status: response.status,
            contentType: response.headers.get("content-type"),
            ok: response.ok,
          });

          if (response.ok) {
            const data = await response.json();
            console.log("API data:", data);
            const newUserData = {
              username: data.username || `fid:${context.fid}`,
              pfpUrl: data.pfpUrl || "/default-avatar.jpg",
              fid: context.fid,
            };
            console.log("Setting user data:", newUserData);
            setUserData(newUserData);
          } else {
            throw new Error(`API failed: ${await response.text()}`);
          }
        } else {
          throw new Error("No fid in context");
        }
      } catch (error) {
        console.error("Error:", error);
        setError(error.message);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };

    initializeSDK();
  }, []);

  return (
    <FarcasterContext.Provider value={{ userData, error, isInitialized }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
