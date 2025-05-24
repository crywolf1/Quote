"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { connectToWallet } from "../lib/connectToWallet";

const FarcasterContext = createContext();

export function useFarcaster() {
  return useContext(FarcasterContext);
}

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [sdk, setSdk] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [neynarAuthData, setNeynarAuthData] = useState(null);

  // Use Wagmi hooks properly
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // SDK initialization with proper error handling
  useEffect(() => {
    async function loadSdk() {
      if (typeof window !== "undefined") {
        try {
          console.log("Initializing Farcaster SDK...");
          const module = await import("@farcaster/frame-sdk");
          setSdk(module.sdk);

          await module.sdk.actions.ready({
            disableNativeGestures: true,
            preventDefaultFarcasterHandlers: false,
          });

          console.log("SDK ready status confirmed");
          setIsInitialized(true);
          setLoading(false);
        } catch (err) {
          console.error("Failed to load Farcaster SDK:", err);
          setError(`SDK initialization failed: ${err.message}`);
          setLoading(false);
        }
      }
    }

    loadSdk();
  }, []);

  // Enhanced wallet connection function that passes SDK
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // PROPER APPROACH: Use the farcasterFrame connector directly
      const frameConnector = connectors.find((c) => c.id === "farcasterFrame");

      if (frameConnector) {
        console.log("Connecting with farcasterFrame connector...");
        await connect({ connector: frameConnector });
        setLoading(false);
        return true;
      }

      // FALLBACK: Use our utility if connector isn't found
      const connected = await connectToWallet(sdk);
      setLoading(false);
      return connected;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setError("Failed to connect wallet. Please try again.");
      setLoading(false);
      return false;
    }
  }, [connect, connectors, sdk]);

  // Auto-connect when SDK is initialized if not already connected
  useEffect(() => {
    if (sdk && isInitialized && !isConnected) {
      // Give a small delay to ensure everything is ready
      const timer = setTimeout(() => {
        connectWallet().then((success) => {
          console.log("Auto-connection attempt result:", success);
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [sdk, isInitialized, isConnected, connectWallet]);

  // Your existing tryGetUserData function
  const tryGetUserData = async () => {
    if (!sdk) return false;

    setLoading(true);
    setError("");

    try {
      let fid = null;

      // Try to get user context from Frame
      try {
        const context = await sdk.actions.getContext?.();
        console.log("Frame context:", context);
        if (context) {
          fid = context.fid;
        }
      } catch (contextError) {
        console.warn("Error getting frame context:", contextError);
      }

      // If we have an FID from Frame, fetch user data
      if (fid) {
        console.log("Fetching user data by FID:", fid);
        const fidRes = await fetch(`/api/neynar?fid=${fid}`);
        const fidData = await fidRes.json();

        if (fidRes.ok && fidData.users?.length) {
          const user = fidData.users[0];
          setUserData({
            username: user.username || "Anonymous",
            displayName: user.display_name || user.username || "Anonymous",
            pfpUrl: user.pfp_url || "/QuoteIcon.png",
            fid: user.fid,
            followerCount: user.follower_count || 0,
            followingCount: user.following_count || 0,
            verifiedAddresses: user.verified_addresses || {},
          });
          setLoading(false);
          return true;
        }
      }

      // If we have a wallet address, try to find Farcaster user by address
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
            pfpUrl: user.pfp_url || "/QuoteIcon.png",
            fid: user.fid,
            followerCount: user.follower_count || 0,
            followingCount: user.following_count || 0,
            verifiedAddresses: user.verified_addresses || {},
          });
          setLoading(false);
          return true;
        }

        // No Farcaster account found, but we have a wallet - create wallet-only user
        console.log("No Farcaster account found, using wallet-only mode");
        setUserData({
          username: `${address.slice(0, 6)}...${address.slice(-4)}`,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          pfpUrl: "/QuoteIcon.png",
          fid: null,
          followerCount: 0,
          followingCount: 0,
          verifiedAddresses: [address],
          isWalletOnly: true,
        });
        setLoading(false);
        return true;
      } else {
        // No wallet connected
        console.log("No wallet connected, waiting for connection");
        setUserData(null);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);

      // If we at least have a wallet, create a wallet-only profile
      if (address) {
        setUserData({
          username: `${address.slice(0, 6)}...${address.slice(-4)}`,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          pfpUrl: "/QuoteIcon.png",
          fid: null,
          followerCount: 0,
          followingCount: 0,
          verifiedAddresses: [address],
          isWalletOnly: true,
        });
        setError(""); // Clear error since wallet-only is valid
      } else {
        // Don't set userData to a guest - set to null to trigger connect UI
        setUserData(null);
        setError("Connect your wallet to continue"); // This is a guide, not an error
      }

      setLoading(false);
      return !!address; // Return true if at least wallet is connected
    }
  };

  // Call tryGetUserData when SDK is initialized
  useEffect(() => {
    if (sdk) {
      tryGetUserData();
    }
  }, [sdk]);

  // Call tryGetUserData when wallet is connected
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
        sdk,
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}
