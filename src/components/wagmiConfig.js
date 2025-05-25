import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { http } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

// Configure chains list
const chains = [base];

// Basic Farcaster environment detection - simplified
const isFarcasterEnv =
  typeof window !== "undefined" &&
  (window.farcaster != null ||
    window.__FARCASTER_FRAME_CONTEXT__ != null ||
    navigator.userAgent.includes("Warpcast") ||
    document.referrer.includes("warpcast.com"));

// Get default connectors for non-Farcaster environments
const { connectors: defaultConnectors } = getDefaultWallets({
  appName: "Quoted App",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains,
});

// Set up connectors with Farcaster first when in Farcaster environment
const connectors = isFarcasterEnv
  ? [farcasterFrame(), ...defaultConnectors]
  : defaultConnectors;

// Create wagmi config with minimal options
export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [base.id]: http(),
  },
  autoConnect: true, // Essential for auto-connection
});

// Export helper function and chains
export const detectFarcasterEnvironment = () => isFarcasterEnv;
export { chains };
