"use client";

import { createContext, useContext, useEffect, useState } from "react";

const FarcasterContext = createContext({
  fid: null,
  username: null,
  displayName: null,
  pfpUrl: null,
  isInFrame: false,
  isConnected: false,
});

export const useFarcaster = () => useContext(FarcasterContext);

export default function FarcasterMiniAppProvider({ children }) {
  const [userData, setUserData] = useState({
    fid: null,
    username: null,
    displayName: null,
    pfpUrl: null,
    isInFrame: false,
    isConnected: false,
  });

  useEffect(() => {
    // Check if we're in a Farcaster client environment
    const checkFarcasterEnvironment = async () => {
      try {
        // Detect if we're in a Farcaster frame/mini app context
        const isInFrame =
          window.location.href.includes("?fc=") ||
          document.referrer.includes("warpcast.com") ||
          window.location.href.includes("warpcast.com");

        // Parse URL parameters to get user data if present
        const urlParams = new URLSearchParams(window.location.search);

        const fid = urlParams.get("fid");
        const username = urlParams.get("username");
        const displayName = urlParams.get("displayName") || username || "Guest";
        const pfpUrl = urlParams.get("pfpUrl") || "/default-avatar.jpg";

        setUserData({
          fid,
          username,
          displayName,
          pfpUrl,
          isInFrame,
          isConnected: !!fid,
        });

        // Optional: If we detect we're in a frame but don't have user data yet,
        // could redirect to auth endpoint or show a connect button
      } catch (error) {
        console.error("Error detecting Farcaster environment:", error);
      }
    };

    if (typeof window !== "undefined") {
      checkFarcasterEnvironment();
    }
  }, []);

  return (
    <FarcasterContext.Provider value={userData}>
      {children}
    </FarcasterContext.Provider>
  );
}
