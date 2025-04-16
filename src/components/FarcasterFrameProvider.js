"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useAccount } from "wagmi"; // <-- add this

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { address } = useAccount(); // <-- add this

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        await sdk.actions.ready();
        setIsInitialized(true);

        // Log SDK object to inspect available methods
        console.log("SDK object:", sdk);
        console.log("SDK actions:", sdk.actions);

        // Replace getFrameContext with the correct method or fallback
        const context = sdk.actions.getContext
          ? await sdk.actions.getContext()
          : {};
        console.log("Frame context:", context);

        const userAddress = context?.address || address;
        console.log("Using address for lookup:", userAddress);

        // Fetch user data logic...
      } catch (error) {
        console.error("Farcaster SDK initialization error:", error);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
        setError("Failed to initialize Farcaster SDK.");
      } finally {
        setLoading(false);
      }
    };

    initializeSDK();
  }, [address]);

  return (
    <FarcasterContext.Provider
      value={{ userData, isInitialized, loading, error }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}
export function useFarcaster() {
  return useContext(FarcasterContext);
}
