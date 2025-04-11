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
      // Check if SDK is available
      if (!sdk) {
        console.error("Farcaster SDK not found");
        setError("SDK not available");
        return;
      }

      console.log("Starting SDK initialization...", { sdk });

      try {
        // Check if we're in Warpcast environment
        const isInWarpcast = window?.parent !== window;
        console.log("Environment check:", {
          isInWarpcast,
          windowLocation: window.location.href,
          parentLocation: window?.parent?.location?.href,
        });

        // Initialize Farcaster SDK with debug info
        console.log("SDK actions available:", Object.keys(sdk.actions));
        await sdk.actions.ready();
        console.log("✅ Farcaster SDK ready");
        setIsInitialized(true);

        // Get frame context with debug info
        const context = await sdk.getContext();
        console.log("Frame context:", {
          context,
          hasContext: !!context,
          hasFid: !!context?.fid,
        });

        if (context?.fid) {
          // Build API URL with origin for production
          const baseUrl = window.location.origin;
          const apiUrl = `${baseUrl}/api/neynar/neynar?fid=${context.fid}`;
          console.log("API call:", { apiUrl, fid: context.fid });

          try {
            const response = await fetch(apiUrl);
            const contentType = response.headers.get("content-type");
            console.log("API response:", {
              status: response.status,
              contentType,
              ok: response.ok,
            });

            const data = await response.json();
            console.log("API data:", data);

            if (response.ok && data) {
              const newUserData = {
                username: data.username || `fid:${context.fid}`,
                pfpUrl: data.pfpUrl || "/default-avatar.jpg",
                fid: context.fid,
              };
              console.log("Setting user data:", newUserData);
              setUserData(newUserData);
            } else {
              throw new Error(data?.error || "Failed to fetch user data");
            }
          } catch (apiError) {
            console.error("API error details:", {
              message: apiError.message,
              stack: apiError.stack,
            });
            setError(`API Error: ${apiError.message}`);
            setUserData({
              username: `fid:${context.fid}`,
              pfpUrl: "/default-avatar.jpg",
              fid: context.fid,
            });
          }
        } else {
          console.warn("Context validation failed:", { context });
          setError("Invalid context");
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("SDK error details:", {
          message: error.message,
          stack: error.stack,
          initialized: isInitialized,
        });
        setError(`SDK Error: ${error.message}`);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };

    initializeSDK();
  }, []);

  // Enhanced debug logging
  useEffect(() => {
    console.log("Provider state:", {
      hasUserData: !!userData,
      userData,
      error,
      isInitialized,
    });
  }, [userData, error, isInitialized]);

  return (
    <FarcasterContext.Provider value={{ userData, error, isInitialized }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
