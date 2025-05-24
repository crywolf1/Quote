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
    // Use the current URL without any trailing slash
    return window.location.origin;
  }
  // Fallback URL for server-side rendering
  return "https://quote-dusky.vercel.app";
};

// Set up default connectors with additional options for better error handling
const { connectors: defaultConnectors } = getDefaultWallets({
  appName: "Quoted App",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains,
  // Fix WalletConnect metadata to match actual URL
  walletConnectOptions: {
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    showQrModal: true,
    metadata: {
      name: "Quoted App",
      description: "Share your thoughts as quotes",
      url: getAppUrl(),
      icons: ["https://quote-dusky.vercel.app/QuoteIcon.png"],
    },
  },
});

// Check if we're in a Warpcast environment
const isWarpcastEnvironment = () => {
  if (typeof window !== "undefined") {
    // Check user agent (safe method)
    if (navigator.userAgent.includes("Warpcast")) {
      return true;
    }

    // Check referrer (safe method)
    if (document.referrer && document.referrer.includes("warpcast.com")) {
      return true;
    }

    // Safely try to check parent frame without causing errors
    try {
      if (window.parent && window.parent.farcaster) {
        return true;
      }
    } catch (e) {
      // Silently ignore cross-origin errors
    }
  }
  return false;
};

// Only add the Farcaster connector when in Warpcast environment
const connectors = isWarpcastEnvironment()
  ? [
      farcasterFrame({
        chains,
        options: {
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        },
      }),
      ...defaultConnectors,
    ]
  : defaultConnectors;

// Custom logger to filter out specific extension errors
const customLogger = {
  warn: (message) => {
    // Filter out common warnings and runtime.sendMessage errors
    if (
      typeof message === "string" &&
      !message.includes("runtime.sendMessage") &&
      !message.includes("Extension ID") &&
      !message.includes("WalletConnect Core is already initialized") &&
      !message.includes("differs from the actual page url")
    ) {
      console.warn(message);
    }
  },
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Create config with http transport - Wagmi v2 syntax
export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [base.id]: http(),
  },
  // Add logger to filter runtime.sendMessage errors
  logger: customLogger,
  // Add batching for more efficient RPC calls
  batch: {
    multicall: true,
  },
  // Reduce extension communication errors with better timeouts
  pollingInterval: 4000,
  // Add auto-reconnection behavior configuration
  autoConnect: false, // Set this to false to prevent automatic reconnection
});

export { chains };
