"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Neynar from "@neynar/nodejs-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeNeynar = async () => {
      try {
        // Step 1: Initialize Neynar with your API key
        const neynar = new Neynar({
          apiKey: process.env.NEYNAR_API_KEY, // Replace with your actual API key
        });
        console.log("Neynar initialized");

        // Step 2: Fetch user data
        const user = await neynar.getUser();
        console.log("Neynar user data:", user);

        // Step 3: Set user data
        if (user && user.username) {
          setUserData({
            username: user.username,
            pfpUrl: user.pfpUrl || "/default-avatar.jpg",
          });
        } else {
          console.warn("No valid user data found");
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("Neynar initialization or user fetch failed:", error);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };

    initializeNeynar();
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
