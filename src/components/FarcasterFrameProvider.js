"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk"; // Import the Farcaster SDK

const FarcasterContext = createContext();

export const FarcasterFrameProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Signal to Farcaster that the app is ready
        await sdk.actions.ready();

        // Extract the FID from the URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const fid = urlParams.get("fid");

        if (!fid) {
          console.log("FID not found, using guest.");
          return setUserData(null);
        }

        // Fetch user data from your API
        const res = await fetch(`/api/neynar?fid=${fid}`);
        const data = await res.json();

        if (data && data.username) {
          setUserData({
            username: data.username,
            pfpUrl: data.pfpUrl,
          });
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error("Error initializing Farcaster app:", error);
        setUserData(null);
      }
    };

    initializeApp();
  }, []);

  return (
    <FarcasterContext.Provider value={{ userData }}>
      {children}
    </FarcasterContext.Provider>
  );
};

export const useFarcaster = () => useContext(FarcasterContext);