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

  // Normalize the URL by removing trailing slashes
  const url = window.location.href.split("?")[0].split("#")[0];
  const base = url.endsWith("/") ? url.slice(0, -1) : url;

  // Return only the origin part to match WalletConnect expectations
  try {
    const urlObj = new URL(base);
    return urlObj.origin;
  } catch (e) {
    return base;
  }
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

// Detect if device is mobile for better transaction handling
const isMobileDevice =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

// Evaluate once during initialization
const isFarcasterEnv =
  typeof window !== "undefined" ? detectFarcasterEnv() : false;
console.log("Farcaster environment detected:", isFarcasterEnv);
console.log("Mobile device detected:", isMobileDevice);

let walletConnectInitialized = false;
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Create wallets with proper metadata URL
const { connectors: defaultConnectors } = getDefaultWallets({
  appName: "Quoted App",
  projectId: walletConnectProjectId,
  chains,
  walletConnectOptions: {
    projectId: walletConnectProjectId,
    metadata: {
      name: "Quoted App",
      description: "Share your thoughts as quotes",
      url: getMetadataUrl(),
      icons: ["https://quote-dusky.vercel.app/QuoteIcon.png"],
    },
    qrModalOptions: {
      // FIXED: Improved mobile wallet handling
      reInitOnNetworkChange: false,
      explorerRecommendedWalletIds: [],
      // Added specific mobile options
      mobileLinks: [
        "rainbow",
        "metamask",
        "trust",
        "argent",
        "zerion",
        "imtoken",
      ],
      // Add desktop links for completeness
      desktopLinks: ["rainbow", "metamask", "coinbase", "zerion"],
      // Give wallet more time to respond on mobile
      connectTimeout: isMobileDevice ? 15000 : 10000,
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

// NEW: Export helper functions for transaction management
export const prepareWalletForTransaction = async (walletClient) => {
  if (!walletClient) return false;

  try {
    if (isMobileDevice) {
      console.log("Preparing mobile wallet for transaction");

      // Force wallet availability check first
      try {
        const addresses = await walletClient.getAddresses();
        console.log("Mobile wallet addresses detected:", addresses);

        // Check if we have addresses but no active provider - indicates we need to redirect
        if (
          addresses?.length &&
          typeof window !== "undefined" &&
          (!window.ethereum?.isConnected || !window.ethereum?.selectedAddress)
        ) {
          console.log("Mobile wallet needs activation/redirection");

          // Attempt to wake up the wallet app
          try {
            // This will force the wallet to prompt for connection if needed
            await walletClient.switchChain({ id: base.id });
          } catch (switchErr) {
            console.log(
              "Chain switch failed, but may have activated wallet app:",
              switchErr
            );
            // This error is expected in some cases and actually helps wake up the wallet
          }

          // Give mobile wallet time to initialize its connection
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (err) {
        console.error("Mobile wallet not ready:", err);

        // If we're in a situation where the wallet provider exists but isn't connected
        if (typeof window !== "undefined" && window.ethereum) {
          try {
            console.log(
              "Attempting to explicitly connect mobile wallet provider..."
            );
            // This direct request can trigger the wallet app to open
            await window.ethereum.request({ method: "eth_requestAccounts" });

            // Better chance of wallet being ready after this call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return true;
          } catch (connErr) {
            console.error("Failed to explicitly connect wallet:", connErr);
            return false;
          }
        }

        return false;
      }

      // This longer delay gives mobile wallets more time to prepare
      console.log(
        "Mobile wallet check complete, allowing more time for mobile connection..."
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return true;
    }

    // For desktop, verify wallet is available
    const addresses = await walletClient.getAddresses();
    return addresses && addresses.length > 0;
  } catch (err) {
    console.error("Error preparing wallet for transaction:", err);
    return false;
  }
};
// Export helper function and chains
export const detectFarcasterEnvironment = detectFarcasterEnv;
export { chains, isMobileDevice };
