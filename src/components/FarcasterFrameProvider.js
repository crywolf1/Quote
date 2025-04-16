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
  const { address: walletAddress } = useAccount();

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        await sdk.actions.ready();
        setIsInitialized(true);

        const context = sdk.actions.getContext
          ? await sdk.actions.getContext()
          : {};

        console.log("Frame context:", context);

        const fid = context?.fid;
        const address = context?.address || walletAddress;

        console.log("Looking up with FID:", fid);
        console.log("Or with address:", address);

        let userRes;
        if (fid) {
          userRes = await fetch(`/api/neynar?fid=${fid}`);
        } else if (address) {
          userRes = await fetch(`/api/neynar?address=${address}`);
        }

        const result = await userRes.json();

        if (!userRes.ok || !result.users || !result.users.length) {
          throw new Error("User not found");
        }

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
  }, [walletAddress]);

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
