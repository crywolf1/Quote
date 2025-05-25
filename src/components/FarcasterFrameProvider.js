"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { detectFarcasterEnvironment } from "./wagmiConfig";
import { FaSpinner } from "react-icons/fa";

// Create context for Farcaster data and functions
const FarcasterContext = createContext();

// Hook to easily access Farcaster context
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
  const [isFarcasterEnvironment, setIsFarcasterEnvironment] = useState(false);

  // Get account and connection functions from wagmi
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Detect if we're in a Farcaster environment on mount

  const detectFarcasterEnvironment = () => {
  if (typeof window === "undefined") return false;

  return !!(
    window.farcaster ||
    window.__FARCASTER_FRAME_CONTEXT__ ||
    navigator.userAgent.includes("Warpcast") ||
    document.referrer.includes("warpcast.com")
  );
};

// Add this to your useEffect
useEffect(() => {
  const isFarcasterEnv = detectFarcasterEnvironment();
  if (isFarcasterEnv) {
    console.log("Detected Farcaster environment, setting up special handling");
    // Your existing Farcaster provider setup
  }
}, []);

  useEffect(() => {
    // Log detailed device and environment info
    if (typeof window !== "undefined") {
      console.log("📱 DEVICE DETAILS:", {
        userAgent: navigator.userAgent,
        isMobile: /Android|iPhone|iPad/i.test(navigator.userAgent),
        isAndroid: /Android/i.test(navigator.userAgent),
        isIOS: /iPhone|iPad/i.test(navigator.userAgent),
        inWarpcast: /Warpcast/i.test(navigator.userAgent),
        hasDirectProvider: !!window.farcaster?.ethereum,
        hasOriginalProvider: !!window.ethereum,
        inIframe: window !== window.top,
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isInFarcaster = detectFarcasterEnvironment();
      setIsFarcasterEnvironment(isInFarcaster);
      console.log("Running in Farcaster environment:", isInFarcaster);
    }
  }, []);

  // SDK initialization
  useEffect(() => {
    async function loadSdk() {
      if (typeof window !== "undefined") {
        try {
          console.log("Initializing Farcaster SDK...");
          const module = await import("@farcaster/frame-sdk");
          setSdk(module.sdk);
          await module.sdk.actions.ready({ disableNativeGestures: true });
          console.log("✅ Farcaster SDK ready");
          setIsInitialized(true);
          setLoading(false);
        } catch (err) {
          console.error("❌ Failed to load Farcaster SDK:", err);
          setError(`SDK initialization failed: ${err.message}`);
          setLoading(false);
        }
      }
    }
    loadSdk();
  }, []);

  // Auto-connect to wallet when in Farcaster environment
  useEffect(() => {
    // Only attempt connection if in Farcaster and not already connected
    if (!isConnected && !walletDetectionAttempted) {
      const attemptConnection = async () => {
        console.log("🔄 Starting auto-connection attempt");
        setWalletDetectionAttempted(true);

        try {
          // Step 1: Try direct Farcaster provider first
          if (window.farcaster?.ethereum) {
            console.log(
              "📱 Found direct Farcaster provider, attempting connection"
            );
            try {
              await window.farcaster.ethereum.request({
                method: "eth_requestAccounts",
              });
              console.log("✅ Connected via direct Farcaster provider");
              // Allow state update to propagate
              return;
            } catch (err) {
              console.warn(
                "⚠️ Direct provider connection failed:",
                err.message
              );
            }
          } else {
            console.log(
              "ℹ️ No direct Farcaster provider found in window.farcaster.ethereum"
            );
          }

          // Step 2: Find and use the Farcaster connector
          const farcasterConnector = connectors.find(
            (c) =>
              c.id === "farcasterFrame" ||
              c.name?.toLowerCase()?.includes("farcaster")
          );

          if (farcasterConnector) {
            console.log(
              "🔄 Found Farcaster connector, attempting connection",
              farcasterConnector
            );
            await connect({ connector: farcasterConnector });
            console.log("✅ Connected with Farcaster connector");
          } else {
            // Step 3: Last resort - try the first available connector
            console.log(
              "⚠️ No Farcaster connector found, trying first available connector"
            );
            const firstConnector = connectors[0];
            if (firstConnector) {
              await connect({ connector: firstConnector });
            } else {
              console.error("❌ No connectors available for connection!");
            }
          }
        } catch (error) {
          console.error("❌ Auto-connection failed:", error);
        }
      };

      // Delay connection attempt to ensure everything is initialized properly
      const timer = setTimeout(attemptConnection, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, connect, connectors, walletDetectionAttempted]);
  // Enhanced wallet connection function that prioritizes Farcaster connector
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🔌 Connect wallet function called");

      // Find the Farcaster connector if available
      const farcasterConnector = connectors.find(
        (c) =>
          c.id === "farcasterFrame" ||
          c.name?.toLowerCase().includes("farcaster")
      );

      if (isFarcasterEnvironment && farcasterConnector) {
        console.log("🔄 Using Farcaster-specific connector");
        await connect({ connector: farcasterConnector });
      } else {
        // No specific connector found or not in Farcaster, use first available
        console.log("🔄 Using first available connector");
        await connect();
      }

      setWalletDetectionAttempted(true);
      setLoading(false);
      return true;
    } catch (error) {
      console.error("❌ Error connecting wallet:", error);
      setError("Failed to connect wallet. Please try again.");
      setLoading(false);
      return false;
    }
  }, [connect, connectors, isFarcasterEnvironment]);

  // Ensure Farcaster provider is properly recognized for transactions
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Function to ensure Farcaster provider takes precedence
    // Replace the ensureFarcasterProvider function with this enhanced version:
    const ensureFarcasterProvider = () => {
      if (window.farcaster?.ethereum) {
        // Already using Farcaster provider
        if (window.ethereum === window.farcaster.ethereum) {
          return;
        }

        console.log("📱 Setting up Farcaster provider handling");

        // Keep reference to original provider
        window._originalEthereum = window._originalEthereum || window.ethereum;

        // Create a proxy provider that intelligently routes requests
        const proxyProvider = {
          ...window.farcaster.ethereum,

          request: async (args) => {
            console.log("📝 Intercepted provider request:", args.method);

            // ADD THIS: Early mobile check before any requests
            const isMobileDevice = /Android|iPhone/i.test(navigator.userAgent);
            const isTransaction = args.method === "eth_sendTransaction";

            // For mobile devices, check if using external wallet
            if (isMobileDevice && isTransaction) {
              console.log(
                "📱 Mobile transaction detected, external wallet flag:",
                window._farcasterUsingExternalWallet
              );

              // If using external wallet on mobile, try directly
              if (
                window._farcasterUsingExternalWallet &&
                window._originalEthereum
              ) {
                try {
                  console.log(
                    "⚡ Routing directly to external wallet on mobile"
                  );
                  return await window._originalEthereum.request(args);
                } catch (directErr) {
                  console.warn("❌ Direct external wallet failed:", directErr);
                  // Fall back to normal flow
                }
              }
            }

            // For reading operations, prefer Farcaster provider
            try {
              return await window.farcaster.ethereum.request(args);
            } catch (err) {
              console.warn("⚠️ Falling back to original provider:", err);
              return await window._originalEthereum.request(args);
            }
          },
        };

        // Install the proxy provider
        window.ethereum = proxyProvider;
      } else if (window._originalEthereum && !window.farcaster?.ethereum) {
        // Restore original provider if Farcaster is no longer available
        console.log("🔄 Restoring original ethereum provider");
        window.ethereum = window._originalEthereum;
      }
    };
    // Check immediately
    ensureFarcasterProvider();

    // And set up a periodic check to maintain proper provider configuration
    const interval = setInterval(ensureFarcasterProvider, 3000);

    return () => clearInterval(interval);
  }, []);

  // Function to fetch user data from Farcaster
  const tryGetUserData = useCallback(async () => {
    if (!sdk) return false;

    setLoading(true);
    setError("");

    try {
      let fid = null;

      // Try to get user context from Frame
      try {
        const context = await sdk.actions.getContext?.();
        console.log("Frame context:", context);

        // Check if using external wallet via Warpcast
        const usingExternalWallet =
          context?.isExternalWallet ||
          (context?.network?.includes("mainnet") &&
            !window.farcaster?.isNativeWallet);

        console.log("Using external wallet:", usingExternalWallet);

        if (context) {
          fid = context.fid;

          // Store this for transaction logic
          window._farcasterUsingExternalWallet = usingExternalWallet;
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
  }, [sdk, address]);

  // Call tryGetUserData when SDK is initialized
  useEffect(() => {
    if (sdk) {
      tryGetUserData();
    }
  }, [sdk, tryGetUserData]);

  // Call tryGetUserData when wallet is connected
  useEffect(() => {
    if (isConnected && address && sdk) {
      tryGetUserData();
    }
  }, [address, isConnected, sdk, tryGetUserData]);

  // Log connection state changes for debugging
  useEffect(() => {
    console.log("Connection state:", {
      isConnected,
      address,
      sdkReady: !!sdk && isInitialized,
      userData: !!userData,
      inFarcasterEnv: isFarcasterEnvironment,
    });
  }, [
    isConnected,
    address,
    sdk,
    isInitialized,
    userData,
    isFarcasterEnvironment,
  ]);

  return (
    <FarcasterContext.Provider
      value={{
        userData,
        isInitialized,
        loading,
        error,
        connectWallet,
        connect,
        disconnect,
        tryGetUserData,
        isConnected,
        setNeynarAuthData,
        neynarAuthData,
        sdk,
        isFarcasterEnvironment,
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}

// Export the CustomConnectButton component as default
export default function CustomConnectButton({ className, ...props }) {
  const farcaster = useFarcaster();

  // Safely access context properties with fallbacks
  const loading = farcaster?.loading || false;
  const connectWallet = farcaster?.connectWallet;
  const isConnected = farcaster?.isConnected || false;
  const userData = farcaster?.userData || null;

  // Create a proper handler function
  const handleConnect = async () => {
    console.log("Connect button clicked");
    if (typeof connectWallet === "function") {
      try {
        await connectWallet();
      } catch (error) {
        console.error("Connection error:", error);
      }
    } else {
      console.error("connectWallet function not available");
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className={`connect-button ${className || ""}`}
      {...props}
    >
      {loading ? (
        <span className="loading-state">
          <FaSpinner className="spin" /> Connecting...
        </span>
      ) : isConnected ? (
        <span className="connected-state">
          {userData?.displayName || userData?.username || "Connected"}
        </span>
      ) : (
        <span className="connect-state">Connect Wallet</span>
      )}
    </button>
  );
}
