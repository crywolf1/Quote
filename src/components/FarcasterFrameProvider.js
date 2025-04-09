// src/components/FarcasterFrameProvider.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Step 1: Signal readiness
        await sdk.actions.ready();
        console.log("SDK is ready");

        // Step 2: Attempt sign-in
        console.log("Attempting sign-in...");
        const signInResult = await sdk.signin();
        console.log("Sign-in result:", signInResult);

        // Step 3: Get user data
        const user = sdk.user;
        console.log("User object after sign-in:", user);

        if (user && user.username) {
          setUserData({
            username: user.username,
            pfpUrl: user.pfpUrl || "/default-avatar.jpg",
          });
          console.log("User data set:", user);
        } else {
          console.warn("No valid user data found after sign-in");
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("SDK initialization or sign-in failed:", error);
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
