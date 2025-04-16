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
        let context = {};
        try {
          if (sdk.actions.getContext) {
            context = await sdk.actions.getContext();
          }
        } catch (contextError) {
          console.warn("Error getting frame context:", contextError);
        }

        console.log("Frame context:", context);

        const fid = context?.fid;
        const userAddress = context?.address || address;

        console.log("Using address for lookup:", userAddress);

        // Fetch user data from the API
        if (fid) {
          console.log("Fetching data using FID:", fid);
          try {
            const userRes = await fetch(`/api/neynar?fid=${fid}`);
            const result = await userRes.json();

            console.log("API response for FID:", result);

            if (userRes.ok && result.users && result.users.length) {
              const user = result.users[0];

              // Use the correct property names from the API
              setUserData({
                username: user.username || "Anonymous",
                displayName: user.display_name || user.username || "Anonymous",
                pfpUrl: user.pfp_url || "/default-avatar.jpg", // Use pfp_url instead of pfp.url
                fid: user.fid,
              });
              return; // Exit early if successfully fetched with FID
            }
          } catch (fidError) {
            console.warn(
              "Failed to fetch with FID, trying address...",
              fidError
            );
          }
        }

        if (userAddress) {
          console.log("Fetching data using address:", userAddress);
          try {
            const userRes = await fetch(`/api/neynar?address=${userAddress}`);
            const result = await userRes.json();

            console.log("API response for address:", result);

            if (userRes.ok && result.users && result.users.length) {
              const user = result.users[0];

              // Use the correct property names from the API
              setUserData({
                username: user.username || "Anonymous",
                displayName: user.display_name || user.username || "Anonymous",
                pfpUrl: user.pfp_url || "/default-avatar.jpg", // Use pfp_url instead of pfp.url
                fid: user.fid,
              });
              return; // Exit early if successfully fetched with address
            } else {
              throw new Error("User not found with address");
            }
          } catch (addressError) {
            console.error("Error fetching with address:", addressError);
            throw new Error(
              "No Farcaster account found for this wallet address"
            );
          }
        } else {
          throw new Error("No FID or wallet address available");
        }
      } catch (err) {
        console.error("Error in Farcaster initialization:", err);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
        setError(err.message || "Could not fetch user data");
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
