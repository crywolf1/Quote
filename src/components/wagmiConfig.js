import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

// Configure chains list
const chains = [base];

// Get dynamic URL for WalletConnect metadata
const getMetadataUrl = () => {
  // For server-side rendering, use a default
  if (typeof window === "undefined") {
    return "https://quote-dusky.vercel.app";
  }

  // Get URL without trailing slash
  const url = window.location.origin;
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

// Better Farcaster environment detection that works on both client and server
const detectFarcasterEnv = () => {
  // For server-side rendering, default to false
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(
      window.farcaster ||
        window.__FARCASTER_FRAME_CONTEXT__ ||
        navigator.userAgent.includes("Warpcast") ||
        document.referrer.includes("warpcast.com") ||
        window !== window.top // Check if in iframe
    );
  } catch (e) {
    // If error accessing window.top, likely in cross-origin iframe
    return true;
  }
};

// Evaluate once during initialization
const isFarcasterEnv =
  typeof window !== "undefined" ? detectFarcasterEnv() : false;
console.log("Farcaster environment detected:", isFarcasterEnv);

// Create wallets with proper metadata URL
const { connectors: defaultConnectors } = getDefaultWallets({
  appName: "Quoted App",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains,
  walletConnectOptions: {
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    metadata: {
      name: "Quoted App",
      description: "Share your thoughts as quotes",
      url: getMetadataUrl(),
      icons: ["https://quote-dusky.vercel.app/QuoteIcon.png"],
    },
  },
});

// Create connectors array based on environment
const connectors = isFarcasterEnv
  ? [
      farcasterFrame({
        chains,
        shimDisconnect: true, // Helps with reconnection reliability
      }),
      ...defaultConnectors,
    ]
  : defaultConnectors;

// Create a single wagmi config instance
export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [base.id]: http(),
  },
  autoConnect: true,
});

// Export helper function and chains
export const detectFarcasterEnvironment = detectFarcasterEnv;
export { chains };
