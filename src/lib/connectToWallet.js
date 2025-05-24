// Utility function to manually connect to available wallets
export async function connectToWallet() {
  try {
    console.log("📱 Attempting manual wallet connection...");

    // Try to access window.ethereum first
    if (window.ethereum) {
      console.log("Found window.ethereum, requesting accounts...");
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        console.log("✅ Connected accounts:", accounts);
        return true;
      } catch (err) {
        console.warn("window.ethereum request failed:", err.message);
      }
    }

    // Try Farcaster-specific provider
    if (window.farcaster?.ethereum) {
      console.log("Found farcaster.ethereum, requesting accounts...");
      try {
        const accounts = await window.farcaster.ethereum.request({
          method: "eth_requestAccounts",
        });
        console.log("✅ Connected to Farcaster accounts:", accounts);
        return true;
      } catch (err) {
        console.warn("farcaster.ethereum request failed:", err.message);
      }
    }

    // Use Wagmi if available
    try {
      const { connect, connectors } = await import("wagmi");

      // First try Farcaster Frame connector
      const frameConnector = connectors.find((c) => c.id === "farcasterFrame");
      if (frameConnector) {
        console.log("Trying to connect with Farcaster Frame connector...");
        await connect({ connector: frameConnector });
        return true;
      }

      // Try injected connector as fallback
      const injectedConnector = connectors.find((c) => c.id === "injected");
      if (injectedConnector) {
        console.log("Trying to connect with injected connector...");
        await connect({ connector: injectedConnector });
        return true;
      }

      console.warn("No compatible connectors found in wagmi");
    } catch (err) {
      console.warn("wagmi import or connection failed:", err.message);
    }

    console.error("❌ No wallet connection methods succeeded");
    return false;
  } catch (error) {
    console.error("Wallet connection error:", error);
    return false;
  }
}
