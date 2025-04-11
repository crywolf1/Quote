"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk"; // Farcaster SDK

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Step 1: Signal readiness with Farcaster SDK
        await sdk.actions.ready();
        console.log("Farcaster SDK is ready");

        // Step 2: Attempt sign-in with Farcaster SDK
        console.log("Attempting sign-in...");
        const signInResult = await sdk.signin();
        console.log("Sign-in result:", signInResult);

        // Step 3: Get user data from Farcaster SDK
        if (signInResult && signInResult.username) {
          setUserData({
            username: signInResult.username,
            pfpUrl: signInResult.pfpUrl || "/default-avatar.jpg",
          });
          console.log("User data set from Farcaster:", signInResult);
          return; // Exit if Farcaster provides valid data
        }

        // Step 4: Fallback to Neynar API route if Farcaster fails
        console.warn("Farcaster sign-in failed, attempting Neynar...");
        const response = await fetch("/api/neynar/neynar");
        if (response.ok) {
          const user = await response.json();
          setUserData({
            username: user.username,
            pfpUrl: user.pfpUrl || "/default-avatar.jpg",
          });
          console.log("User data set from Neynar API:", user);
        } else {
          console.warn("Neynar API failed to fetch user data");
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("SDK initialization or user fetch failed:", error);
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
