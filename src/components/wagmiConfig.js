import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { injected } from "wagmi/connectors";

// Configure chains list
const chains = [base];

// Get the correct app URL for WalletConnect metadata
const getAppUrl = () => {
  if (typeof window !== "undefined") {
    // Use consistent URL format
    return window.location.origin;
  }
  // Fallback URL for server-side rendering
  return "https://quote-dusky.vercel.app";
};

// Enhanced Farcaster environment detection with better reliability
const isFarcasterEnvironment = () => {
  if (typeof window === "undefined") return false;

  try {
    // Multiple detection methods for increased reliability
    if (
      // Direct provider check
      !!window.farcaster?.ethereum ||
      // User agent check
      navigator.userAgent.includes("Warpcast") ||
      // Referrer check
      (document.referrer && document.referrer.includes("warpcast.com")) ||
      // Frame context check
      !!window.__FARCASTER_FRAME_CONTEXT__ ||
      // Parent window check
      (window.parent && window.parent !== window)
    ) {
      return true;
    }

    // URL parameter checks
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("fc-frame") || urlParams.has("farcaster")) {
      return true;
    }
  } catch (e) {
    console.debug("Farcaster detection error:", e.message);
  }

  return false;
};

// Custom logger to filter out noise
const customLogger = {
  debug: () => {},
  info: () => {},
  warn: (message) => {
    // Filter out common warning messages
    if (
      String(message).includes("WalletConnect Core is already initialized") ||
      String(message).includes("metadata.url")
    ) {
      return;
    }
    console.warn(message);
  },
  error: (...args) => {
    const errorStr = String(args[0] || "");

    // Filter out known harmless errors
    if (
      errorStr.includes("runtime.sendMessage") ||
      errorStr.includes("cross-origin frame") ||
      errorStr.includes("Error in invocation") ||
      errorStr.includes("chrome.runtime") ||
      errorStr.includes("Failed to read") ||
      errorStr.includes("farcaster") ||
      errorStr.includes("useEmbeddedWallet") ||
      errorStr.includes("Cannot set property ethereum")
    ) {
      return;
    }

    console.error(...args);
  },
};

// Set up default connectors with additional options for better error handling
const { connectors: defaultConnectors } = getDefaultWallets({
  appName: "Quoted App",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains,
});

// Create an enhanced Farcaster connector with improved compatibility
const createFarcasterConnector = () => {
  return farcasterFrame({
    chains,
    options: {
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      shimDisconnect: true,
      name: "Quoted App",
    },
  });
};

// Create a manual injected connector with looser constraints
const createCustomInjectedConnector = () => {
  return injected({
    chains,
    options: {
      shimDisconnect: true,
      name: "Browser Wallet",
      getProvider: () => {
        // Try to get any available Ethereum provider
        return window.ethereum || window.farcaster?.ethereum || undefined;
      },
    },
  });
};

// Include all connector types to maximize compatibility
const frameConnector = createFarcasterConnector();
const customInjected = createCustomInjectedConnector();

// Place Farcaster connector first in Farcaster environments
const allConnectors = isFarcasterEnvironment()
  ? [frameConnector, customInjected, ...defaultConnectors]
  : [...defaultConnectors, customInjected, frameConnector];

// Create wagmi config with enhanced options
export const wagmiConfig = createConfig({
  chains,
  connectors: allConnectors,
  transports: {
    [base.id]: http(),
  },
  logger: customLogger,
  batch: {
    multicall: true,
  },
  pollingInterval: 4000,
  autoConnect: true,
});

export { chains };
