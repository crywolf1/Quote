"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected, farcasterFrame } from "@farcaster/frame-wagmi-connector";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [sdk, setSdk] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [neynarAuthData, setNeynarAuthData] = useState(null);
  const [walletDetectionAttempted, setWalletDetectionAttempted] =
    useState(false);

  const { address, isConnected } = useAccount();

  // Use both injected and frame connectors
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Enhanced SDK loading with improved error handling
  useEffect(() => {
    let isMounted = true;

    async function loadSdk() {
      if (typeof window === "undefined") return;

      try {
        console.log("Starting Farcaster SDK initialization...");
        // Use dynamic import to avoid SSR issues
        const module = await import("@farcaster/frame-sdk");

        if (!isMounted) return;

        // Store SDK reference
        setSdk(module.sdk);

        // Check if we're in a frame context
        const isFrame =
          module.sdk.isFrameContext ||
          (window.parent && window.parent !== window) ||
          !!window.__FARCASTER_FRAME_CONTEXT__;

        console.log("Farcaster frame context detected:", isFrame);

        // Initialize SDK with appropriate settings
        await module.sdk.actions.ready({
          disableNativeGestures: true,
          preventDefaultFarcasterHandlers: false,
        });

        if (!isMounted) return;

        console.log("SDK ready status confirmed");
        setIsInitialized(true);
        setLoading(false);

        // Check if Farcaster wallet is available
        if (window.farcaster?.ethereum || (isFrame && window.ethereum)) {
          console.log("✅ Farcaster wallet detected");
        } else {
          console.log("❌ Farcaster wallet not detected");
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load Farcaster SDK:", err);
        setError(`SDK initialization failed: ${err.message}`);
        setLoading(false);
      }
    }

    loadSdk();

    return () => {
      isMounted = false;
    };
  }, []);

  // Enhanced wallet connection function
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Attempting wallet connection...");

      // First try Farcaster Frame connector if available
      const frameConnector = connectors.find((c) => c.id === "farcasterFrame");
      const injectedConnector = connectors.find((c) => c.id === "injected");

      if (frameConnector) {
        try {
          console.log("Trying frame connector...");
          await connect({ connector: frameConnector });
          console.log("✅ Connected with Farcaster Frame connector");
          setWalletDetectionAttempted(true);
          setLoading(false);
          return true;
        } catch (frameError) {
          console.warn("Frame connector failed:", frameError.message);
          // Fall through to injected connector
        }
      }

      // Fallback to injected connector
      if (injectedConnector) {
        try {
          console.log("Trying injected connector...");
          await connect({ connector: injectedConnector });
          console.log("✅ Connected with injected connector");
          setWalletDetectionAttempted(true);
          setLoading(false);
          return true;
        } catch (injectedError) {
          console.error("Injected connector failed:", injectedError.message);
          throw injectedError;
        }
      }

      throw new Error("No compatible wallet connectors found");
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setError(`Failed to connect wallet: ${error.message}`);
      setLoading(false);
      return false;
    }
  }, [connect, connectors]);

  // Modified tryGetUserData function with better error handling
  const tryGetUserData = useCallback(async () => {
    if (!sdk) return false;

    setLoading(true);
    setError("");

    try {
      let fid = null;

      // Try to get user context from Frame with improved error handling
      try {
        console.log("Requesting frame context...");
        const context = await Promise.race([
          sdk.actions.getContext?.(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Context request timeout")), 3000)
          ),
        ]);

        console.log("Frame context response:", context);
        if (context?.fid) {
          fid = context.fid;
          console.log("✅ Got FID from frame context:", fid);
        }
      } catch (contextError) {
        console.warn("Error getting frame context:", contextError.message);
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
        // No wallet connected - just set a null state instead of throwing
        console.log("No wallet connected, waiting for connection");
        setUserData(null); // Set to null so your UI can show connect button
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
  }, [sdk, address]);

  // Try auto-connecting wallet when SDK is initialized
  useEffect(() => {
    if (sdk && isInitialized && !walletDetectionAttempted) {
      setWalletDetectionAttempted(true);

      // Attempt auto-connection in frame environments
      const isFrame =
        sdk.isFrameContext ||
        (window.parent && window.parent !== window) ||
        !!window.__FARCASTER_FRAME_CONTEXT__;

      if (isFrame) {
        console.log("Auto-connecting in frame environment...");
        connectWallet().catch((err) => {
          console.warn("Auto-connection failed:", err.message);
        });
      }
    }
  }, [sdk, isInitialized, walletDetectionAttempted, connectWallet]);

  // Try getting user data when sdk is ready or when wallet connects
  useEffect(() => {
    if (sdk && isInitialized) {
      tryGetUserData();
    }
  }, [sdk, isInitialized, tryGetUserData]);

  useEffect(() => {
    if (isConnected && address && sdk && isInitialized) {
      tryGetUserData();
    }
  }, [address, isConnected, sdk, isInitialized, tryGetUserData]);

  // Add a connection state debugger
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("Connection state:", {
        isConnected,
        address,
        sdkReady: !!sdk && isInitialized,
        userData: !!userData,
      });
    }
  }, [isConnected, address, sdk, isInitialized, userData]);

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

export function useFarcaster() {
  return useContext(FarcasterContext);
}
