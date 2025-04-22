"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [sdk, setSdk] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [neynarAuthData, setNeynarAuthData] = useState(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new injected(),
  });
  const { disconnect } = useDisconnect();

  useEffect(() => {
    async function loadSdk() {
      if (typeof window !== "undefined") {
        try {
          const module = await import("@farcaster/frame-sdk");
          setSdk(module.sdk);
          await module.sdk.actions.ready({ disableNativeGestures: true }); // Call ready as soon as SDK is loaded
          setIsInitialized(true);
          setLoading(false); // Set loading to false once ready is called
        } catch (err) {
          console.error("Failed to load Farcaster SDK:", err);
        }
      }
    }
    loadSdk();
  }, []);

  const connectWallet = async () => {
    try {
      await connect();
      return true;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setError("Failed to connect wallet. Please try again.");
      return false;
    }
  };

  const tryGetUserData = async () => {
    if (!sdk) return;

    setLoading(true);
    setError("");

    try {
      let fid = null;
      let userAddress = null;

      try {
        const context = await sdk.actions.getContext?.();
        console.log("Frame context:", context);
        if (context) {
          fid = context.fid;
          userAddress = context.address;
        }
      } catch (contextError) {
        console.warn("Error getting frame context:", contextError);
      }

      if (fid) {
        console.log("Fetching user data by FID:", fid);
        const fidRes = await fetch(`/api/neynar?fid=${fid}`);
        const fidData = await fidRes.json();

        if (fidRes.ok && fidData.users?.length) {
          const user = fidData.users[0];
          setUserData({
            username: user.username || "Anonymous",
            displayName: user.display_name || user.username || "Anonymous",
            pfpUrl: user.pfp_url || "/assets/icon.png",
            fid: user.fid,
            followerCount: user.follower_count || 0,
            followingCount: user.following_count || 0,
            verifiedAddresses: user.verified_addresses || {},
          });
          setLoading(false);
          return true;
        }
      }

      if (address) {
        const userAddress = address.toLowerCase();
        console.log("Fetching user data by wallet:", userAddress);
        const addrRes = await fetch(`/api/neynar?address=${userAddress}`);
        const addrData = await addrRes.json();

        if (addrRes.ok && addrData.users?.length) {
          const user = addrData.users[0];
          setUserData({
            username: user.username || "Anonymous",
            displayName: user.display_name || user.username || "Anonymous",
            pfpUrl: user.pfp_url || "/default-avatar.jpg",
            fid: user.fid,
            followerCount: user.follower_count || 0,
            followingCount: user.following_count || 0,
          });
          setLoading(false);
          return true;
        }
      }

      // If we still don't have user data, check if there's a signerUuid in localStorage
      const signerUuid = localStorage.getItem("signerUuid");
      if (signerUuid) {
        try {
          const signerRes = await fetch(
            `/api/neynar/signer?signerUuid=${signerUuid}`
          );
          const signerData = await signerRes.json();

          if (signerRes.ok && signerData.user) {
            const user = signerData.user;
            setUserData({
              username: user.username || "Anonymous",
              displayName: user.display_name || user.username || "Anonymous",
              pfpUrl: user.pfp_url || "/default-avatar.jpg",
              fid: user.fid,
              followerCount: user.follower_count || 0,
              followingCount: user.following_count || 0,
            });
            setLoading(false);
            return true;
          }
        } catch (signerError) {
          console.error("Error fetching signer data:", signerError);
        }
      }

      throw new Error("No Farcaster account found");
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData({
        username: "Guest",
        displayName: "Guest",
        pfpUrl: "/default-avatar.jpg",
        fid: null,
        followerCount: 0,
        followingCount: 0,
      });
      setError("Connect your Farcaster account to continue");
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    if (sdk) {
      tryGetUserData();
    }
  }, [sdk]);

  useEffect(() => {
    if (isConnected && address && sdk) {
      tryGetUserData();
    }
  }, [address, isConnected, sdk]);

  return (
    <FarcasterContext.Provider
      value={{
        userData,
        isInitialized,
        loading,
        error,
        connectWallet,
        disconnect,
        tryGetUserData,
        isConnected,
        setNeynarAuthData,
        neynarAuthData,
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
