"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
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
  const [walletDetectionAttempted, setWalletDetectionAttempted] =
    useState(false);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new injected(),
  });
  const { disconnect } = useDisconnect();

  // SDK initialization
  useEffect(() => {
    async function loadSdk() {
      if (typeof window !== "undefined") {
        try {
          console.log("Initializing Farcaster SDK immediately...");
          const module = await import("@farcaster/frame-sdk");
          setSdk(module.sdk);
          await module.sdk.actions.ready({ disableNativeGestures: true }); // Call ready as soon as SDK is loaded
          console.log("SDK ready status confirmed");
          setIsInitialized(true);
          setLoading(false); // Set loading to false once ready is called
        } catch (err) {
          console.error("Failed to load Farcaster SDK:", err);
          setError(`SDK initialization failed: ${err.message}`);
          setLoading(false);
        }
      }
    }
    loadSdk();
  }, []);

  // Enhanced wallet connection using our utility
  const connectWallet = async () => {
    try {
      setLoading(true);

      // First try our specialized utility for direct Farcaster connection
      const connected = await connectToWallet();

      if (connected) {
        setWalletDetectionAttempted(true);
        setLoading(false);
        return true;
      }

      // Fall back to standard connector if needed
      await connect();
      setLoading(false);
      return true;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setError("Failed to connect wallet. Please try again.");
      setLoading(false);
      return false;
    }
  };

  // Ensure Farcaster provider is properly recognized for transactions
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Function to ensure Farcaster provider takes precedence
    const ensureFarcasterProvider = () => {
      if (window.farcaster?.ethereum) {
        // If we have a Farcaster provider but it's not the main provider
        if (window.ethereum !== window.farcaster.ethereum) {
          console.log(
            "Setting Farcaster provider as primary ethereum provider"
          );
          // Keep reference to original provider
          window._originalEthereum =
            window._originalEthereum || window.ethereum;
          // Make Farcaster provider the main one
          window.ethereum = window.farcaster.ethereum;
        }
      }
    };

    // Check immediately
    ensureFarcasterProvider();

    // And set up a periodic check to maintain proper provider configuration
    const interval = setInterval(ensureFarcasterProvider, 3000);

    // Auto-connect if in Farcaster environment
    const isFarcasterEnv =
      window.__FARCASTER_FRAME_CONTEXT__ ||
      navigator.userAgent.includes("Warpcast") ||
      document.referrer.includes("warpcast.com") ||
      (window.parent && window.parent !== window);

    if (isFarcasterEnv && !walletDetectionAttempted && !isConnected) {
      // Try to connect after a small delay to ensure providers are loaded
      const timer = setTimeout(() => {
        connectWallet().then((success) => {
          if (success && address) {
            console.log("Auto-connected to wallet in Farcaster environment");
            tryGetUserData();
          }
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }

    return () => clearInterval(interval);
  }, [walletDetectionAttempted, isConnected, address]);

  // Your existing tryGetUserData function
  const tryGetUserData = async () => {
    if (!sdk) return;

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

  // Log connection state changes for debugging
  useEffect(() => {
    console.log("Connection state:", {
      isConnected,
      address,
      sdkReady: !!sdk && isInitialized,
      userData: !!userData,
    });
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
