"use client";

import { createContext, useContext, useEffect, useState } from "react";

const FarcasterContext = createContext({
  fid: null,
  username: null,
  displayName: null,
  pfpUrl: null,
  isFrameLoaded: false,
});

export const useFarcaster = () => useContext(FarcasterContext);

export default function FarcasterFrameProvider({ children }) {
  const [frameData, setFrameData] = useState({
    fid: null,
    username: null,
    displayName: null,
    pfpUrl: null,
    isFrameLoaded: false,
  });

  useEffect(() => {
    // Function to parse the frame data from URL
    const parseFrameData = () => {
      // Check if we're in a frame context
      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search);

        // Extract Farcaster user data from URL params
        const fid = searchParams.get("fid");
        const username = searchParams.get("username") || "Guest";
        const displayName = searchParams.get("displayName") || username;
        const pfpUrl = searchParams.get("pfpUrl") || "/default-avatar.jpg";

        setFrameData({
          fid,
          username,
          displayName,
          pfpUrl,
          isFrameLoaded: true,
        });
      }
    };

    parseFrameData();
  }, []);

  return (
    <FarcasterContext.Provider value={frameData}>
      {children}
    </FarcasterContext.Provider>
  );
}
