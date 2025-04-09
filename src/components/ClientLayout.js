"use client";

import { FarcasterFrameProvider } from "./FarcasterFrameProvider"; // Change to named import
import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";

export default function ClientLayout({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await sdk.init();
        const user = await sdk.signin();
        setUserData({
          username: user.username || "Guest",
          pfpUrl: user.pfpUrl || "/default-avatar.jpg",
        });
      } catch (error) {
        console.error("Sign-in failed:", error);
        setUserData({ username: "Guest", pfpUrl: "/default-avatar.jpg" });
      }
    };
    initializeAuth();
  }, []);

  return (
    <FarcasterFrameProvider userData={userData}>
      {children}
    </FarcasterFrameProvider>
  );
}
