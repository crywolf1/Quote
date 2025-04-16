"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useAccount } from "wagmi";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { address } = useAccount();

  useEffect(() => {
    const initialize = async () => {
      try {
        await sdk.actions.ready(); // Required to start SDK
        setIsInitialized(true);

        const context = sdk.actions.getContext
          ? await sdk.actions.getContext()
          : {};
        console.log("Frame context:", context);

        const userAddress = context?.address || address;
        if (!userAddress) {
          throw new Error("User address not found.");
        }

        console.log("Using address for lookup:", userAddress);

        // Hit your Neynar API route
        const res = await fetch(`/api/neynar?address=${userAddress}`);
        const data = await res.json();

        if (data && data.username) {
          setUserData(data);
        } else {
          throw new Error("User not found via Neynar.");
        }
      } catch (err) {
        console.error("Farcaster SDK init error:", err);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
        setError("Could not fetch user data.");
      } finally {
        setLoading(false);
      }
    };

    initialize();
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
