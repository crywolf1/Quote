"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Initialize SDK
        await sdk.actions.ready();
        console.log("✅ SDK ready");

        const context = await sdk.actions.getFrameContext();
        console.log("✅ Frame context:", context);

        if (!context?.fid) {
          throw new Error("No FID available in frame context");
        }

        const apiUrl = `https://quote-production-679a.up.railway.app/api/neynar?fid=${context.fid}`;
        console.log("🌐 Fetching user data from:", apiUrl);

        const response = await fetch(apiUrl);
        console.log("📦 Raw fetch response:", response);

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("🎉 Fetched user data:", data);

        if (data.users && data.users.length > 0) {
          const user = data.users[0]; // Access the first user from the array
          setUserData({
            username: user.username || "Guest",
            pfpUrl: user.pfp_url || "/default-avatar.jpg",
            fid: context.fid,
          });
        } else {
          throw new Error("User data is empty or invalid");
        }
      } catch (error) {
        console.error("❌ Error in initializeSDK:", error);
        // Set fallback user data
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
