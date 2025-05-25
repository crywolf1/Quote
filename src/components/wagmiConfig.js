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
// Add this new function below your existing code

export const sendMobileTransaction = async (walletClient, tx) => {
  if (!walletClient) throw new Error("No wallet client available");

  console.log("Sending mobile transaction:", tx);
  await prepareWalletForTransaction(walletClient);

  // For WalletConnect (most mobile wallets), we need to give it more time
  // and handle the connection state more carefully
  const usingWalletConnect =
    !window.ethereum?.isMetaMask && !window.ethereum?.isCoinbaseWallet;

  if (isMobileDevice && usingWalletConnect) {
    console.log("Using mobile WalletConnect - special handling");

    try {
      // Extra time for wallet to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Send transaction - the key part is to let it throw errors up
      return await walletClient.sendTransaction(tx);
    } catch (err) {
      // Carefully examine the error
      const errorMessage = err.message || String(err);

      // If it's a rejection, pass that up
      if (
        errorMessage.includes("reject") ||
        errorMessage.includes("cancel") ||
        errorMessage.includes("denied")
      ) {
        console.log("Transaction rejected by user");
        throw err;
      }

      // If it's a different error, likely connection related
      console.error("Mobile transaction error:", err);
      throw new Error(`Mobile wallet connection issue: ${errorMessage}`);
    }
  }

  // For regular transactions
  return walletClient.sendTransaction(tx);
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

        // Check if using WalletConnect (not window.ethereum)
        const usingWalletConnect =
          !window.ethereum?.isMetaMask && !window.ethereum?.isCoinbaseWallet;

        if (usingWalletConnect) {
          console.log("Using WalletConnect - ensuring session is active");
          // WalletConnect might need a moment to establish connection
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return true;
        }

        // For injected wallets like MetaMask
        if (window.ethereum) {
          console.log("Using injected wallet - ensuring connection");

          // Force connection to ensure wallet is active
          await window.ethereum.request({ method: "eth_requestAccounts" });

          // Additional chainId check to wake up wallet
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x2105" }], // Base chainId
            });
          } catch (switchErr) {
            console.log("Chain switch request sent:", switchErr);
            // Error is expected sometimes, the important part is triggering the wallet
          }

          await new Promise((resolve) => setTimeout(resolve, 1500));
          return true;
        }

        return addresses?.length > 0;
      } catch (err) {
        console.error("Mobile wallet not ready:", err);

        // Last resort - try direct ethereum request
        if (window.ethereum) {
          try {
            console.log("Final attempt to wake up wallet...");
            await window.ethereum.request({ method: "eth_requestAccounts" });
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return true;
          } catch (connErr) {
            console.error("Failed to activate wallet:", connErr);
            return false;
          }
        }
        return false;
      }
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
