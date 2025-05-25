/**
 * Specialized utility to connect to Farcaster's wallet using the official SDK
 */
export async function connectToWallet(sdk) {
  try {
    // Guard against server-side rendering errors
    if (typeof window === 'undefined') {
      console.warn("connectToWallet called during SSR - skipping");
      return false;
    }

    console.log("🔌 Attempting to connect to Farcaster wallet...");

    // PREFERRED APPROACH: Use the SDK's getEthereumProvider method
    if (sdk?.wallet?.getEthereumProvider) {
      try {
        console.log("Using sdk.wallet.getEthereumProvider()...");
        const provider = await sdk.wallet.getEthereumProvider();
        
        if (provider) {
          console.log("✅ Got Ethereum provider from SDK");
          
          try {
            // First check if already connected
            const accounts = await provider.request({ method: 'eth_accounts' });
            
            if (accounts && accounts.length > 0) {
              console.log("✅ Already connected to wallet:", accounts[0]);
              return true;
            }
            
            // If not already connected, request accounts
            console.log("Requesting wallet connection...");
            const requestedAccounts = await provider.request({ method: 'eth_requestAccounts' });
            
            if (requestedAccounts && requestedAccounts.length > 0) {
              console.log("✅ Connected to wallet after request:", requestedAccounts[0]);
              return true;
            }
          } catch (err) {
            console.warn("Error interacting with provider:", err);
          }
        }
      } catch (err) {
        console.warn("Could not get Ethereum provider from SDK:", err);
      }
    }

    // FALLBACK: Try standard connector approach if SDK method failed
    try {
      const { connect, connectors } = await import("wagmi");
      
      // Find the farcasterFrame connector
      const frameConnector = connectors.find(c => c?.id === "farcasterFrame");
      if (frameConnector) {
        try {
          console.log("Using farcasterFrame connector...");
          await connect({ connector: frameConnector });
          console.log("✅ Connected with farcasterFrame connector");
          return true;
        } catch (connectorError) {
          console.warn("farcasterFrame connector failed:", connectorError.message);
        }
      } else {
        console.warn("No farcasterFrame connector found");
      }
    } catch (error) {
      console.warn("Fallback connection attempt failed:", error.message);
    }

    console.log("❌ All connection methods failed");
    return false;
  } catch (error) {
    console.error("Fatal wallet connection error:", error);
    return false;
  }
}