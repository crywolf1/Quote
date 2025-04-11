"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk"; // Farcaster SDK
import Neynar from "@neynar/nodejs-sdk"; // Neynar SDK

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

        // Step 4: Fallback to Neynar if Farcaster fails
        console.warn("Farcaster sign-in failed, attempting Neynar...");
        const neynar = new Neynar({
          apiKey: process.env.NEXT_PUBLIC_NEYNAR_API_KEY, // Use environment variable for API key
        });
        await neynar.init();
        console.log("Neynar initialized");

        const user = await neynar.getUser();
        console.log("Neynar user data:", user);

        if (user && user.username) {
          setUserData({
            username: user.username,
            pfpUrl: user.pfpUrl || "/default-avatar.jpg",
          });
        } else {
          console.warn("No valid user data found in Neynar");
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