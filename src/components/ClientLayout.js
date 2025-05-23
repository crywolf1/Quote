"use client";

import { FarcasterFrameProvider } from "./FarcasterFrameProvider";
import { useEffect, useState } from "react";
// Replace with your actual Farcaster SDK import if applicable
// import { sdk } from "@farcaster/frame-sdk";

export default function ClientLayout({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Example: Replace with your actual authentication logic
        // await sdk.init();
        // const user = await sdk.signin();
        // setUserData({
        //   username: user.username || "Guest",
        //   pfpUrl: user.pfpUrl || "/default-avatar.jpg",
        // });
        setUserData({ username: "Guest", pfpUrl: "/default-avatar.jpg" }); // Placeholder
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
