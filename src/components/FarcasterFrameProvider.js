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
  const { address } = useAccount(); // Wagmi hook to get wallet address

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Initialize the SDK
        await sdk.actions.ready();
        setIsInitialized(true);

        // Log SDK and context to debug
        console.log("SDK object:", sdk);
        console.log("SDK actions:", sdk.actions);

        // Get context from SDK or use fallback
        const context = sdk.actions.getContext
          ? await sdk.actions.getContext()
          : {};

        console.log("Frame context:", context);

        const fid = context?.fid;
        const userAddress = context?.address || address;

        console.log("Using address for lookup:", userAddress);

        // Fetch user data from the API
        let userRes;
        if (fid) {
          console.log("Fetching data using FID:", fid);
          userRes = await fetch(`/api/neynar?fid=${fid}`);
        } else if (userAddress) {
          console.log("Fetching data using address:", userAddress);
          userRes = await fetch(`/api/neynar?address=${userAddress}`);
        }

        const result = await userRes.json();

        // Check if response is valid
        if (!userRes.ok || !result.users || !result.users.length) {
          throw new Error("User not found");
        }

        // Set user data
        const user = result.users[0];

        setUserData({
          username: user.username,
          displayName: user.display_name,
          pfpUrl: user.pfp.url,
          fid: user.fid,
        });
      } catch (err) {
        console.error("Error fetching user data:", err);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
        setError("Could not fetch user data");
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
