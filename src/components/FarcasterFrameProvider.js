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
        await sdk.actions.ready();
        console.log("SDK is ready");

        // Check if user is already signed in
        const user = sdk.user;
        if (user && user.username) {
          setUserData({
            username: user.username,
            pfpUrl: user.pfpUrl || "/default-avatar.jpg",
          });
          console.log("User already signed in:", user);
        } else {
          console.log("No user data on initial load, awaiting manual sign-in");
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

  const handleSignIn = async () => {
    try {
      console.log("Manual sign-in triggered");
      await sdk.signin();
      const user = sdk.user;
      console.log("User after manual sign-in:", user);

      if (user && user.username) {
        setUserData({
          username: user.username,
          pfpUrl: user.pfpUrl || "/default-avatar.jpg",
        });
        console.log("User data updated:", user);
      } else {
        console.warn("Sign-in succeeded but no user data");
      }
    } catch (error) {
      console.error("Manual sign-in failed:", error);
    }
  };

  return (
    <FarcasterContext.Provider value={{ userData, handleSignIn }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
