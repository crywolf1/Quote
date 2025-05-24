import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

// Configure chains list
const chains = [base];

// Get the correct app URL for WalletConnect metadata
const getAppUrl = () => {
  if (typeof window !== "undefined") {
    // Remove trailing slash to prevent URL mismatch errors
    return window.location.origin.replace(/\/$/, "");
  }
  // Fallback URL without trailing slash for server-side rendering
  return "https://quote-dusky.vercel.app";
};

// Enhanced Farcaster environment detection
const isFarcasterEnvironment = () => {
  if (typeof window === "undefined") return false;

  try {
    // Check user agent (safe method)
    if (navigator.userAgent.includes("Warpcast")) {
      return true;
    }

    // Check referrer (safe method)
    if (document.referrer && document.referrer.includes("warpcast.com")) {
      return true;
    }

    // Frame context detection
    if (
      window.__FARCASTER_FRAME_CONTEXT__ ||
      window.parent?.__FARCASTER_FRAME_CONTEXT__
    ) {
      return true;
    }

    // URL parameter checks
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("fc-frame") || urlParams.has("farcaster")) {
      return true;
    }
  } catch (e) {
    console.debug("Frame detection error (safe to ignore):", e.message);
  }

  return false;
};

// Custom logger to filter noise
const customLogger = {
  debug: () => {},
  info: () => {},
  warn: (message) => {
    // Filter out known warning messages
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

// Only initialize wallets/connections once with a flag
let walletInitialized = false;

// Set up wallet connectors
const setupWallets = () => {
  if (walletInitialized) {
    return { connectors: defaultConnectors };
  }

  walletInitialized = true;

  // Get app metadata URL without trailing slash
  const appUrl = getAppUrl();

  const { connectors: defaultConnectors } = getDefaultWallets({
    appName: "Quoted App",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    chains,
    walletConnectOptions: {
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: "Quoted App",
        description: "Share your thoughts as quotes",
        url: appUrl,
        icons: [`${appUrl}/QuoteIcon.png`],
      },
    },
  });

  return { connectors: defaultConnectors };
};

// Get default connectors with initialization protection
const { connectors: defaultConnectors } = setupWallets();

// Safely create Farcaster connector
const createFarcasterConnector = () => {
  return farcasterFrame({
    chains,
    options: {
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      shimDisconnect: true,
      name: "Quoted App",
      // Use a factory function to avoid immediate execution and property conflicts
      getProvider: async () => {
        if (typeof window === "undefined") return null;

        try {
          // Wait a moment to ensure the page is fully loaded
          if (window.farcaster?.ethereum) {
            return window.farcaster.ethereum;
          } else if (window.ethereum) {
            // If farcaster ethereum doesn't exist but window.ethereum does,
            // and we're in a Farcaster environment, use window.ethereum
            if (isFarcasterEnvironment()) {
              return window.ethereum;
            }
          }
        } catch (e) {
          console.debug("Farcaster provider access error:", e.message);
        }

        return null;
      },
    },
  });
};

// Conditionally add the Farcaster connector based on environment
const farcasterConnector = createFarcasterConnector();
const connectors = isFarcasterEnvironment()
  ? [farcasterConnector, ...defaultConnectors]
  : [...defaultConnectors, farcasterConnector];

// Create wagmi config
export const wagmiConfig = createConfig({
  chains,
  connectors,
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
