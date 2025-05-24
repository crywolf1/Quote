/**
 * Specialized utility to connect to Farcaster's wallet without prompting
 * for additional wallet selection
 */
export async function connectToWallet() {
  try {
    console.log("🔌 Attempting to connect to Farcaster wallet...");

    // FIRST PRIORITY: Direct access to Farcaster's ethereum provider if available
    if (window.farcaster?.ethereum) {
      console.log("Found Farcaster ethereum provider, connecting directly...");
      try {
        // This should use the already-connected account without prompting
        const accounts = await window.farcaster.ethereum.request({
          method: "eth_accounts", // Using accounts instead of requestAccounts to avoid prompt
        });

        if (accounts && accounts.length > 0) {
          console.log(
            "✅ Successfully connected to Farcaster wallet:",
            accounts[0]
          );

          // Ensure the Farcaster provider is used for all transactions
          if (window.ethereum !== window.farcaster.ethereum) {
            window._originalEthereum =
              window._originalEthereum || window.ethereum;
            window.ethereum = window.farcaster.ethereum;
            console.log("Set Farcaster ethereum as the primary provider");
          }

          return true;
        }

        console.log(
          "No accounts available in farcaster.ethereum, trying requestAccounts..."
        );
        const requestedAccounts = await window.farcaster.ethereum.request({
          method: "eth_requestAccounts", // This might prompt, but should use Farcaster's UI
        });

        if (requestedAccounts && requestedAccounts.length > 0) {
          console.log(
            "✅ Connected to Farcaster wallet after request:",
            requestedAccounts[0]
          );

          // Ensure the Farcaster provider is used for all transactions
          if (window.ethereum !== window.farcaster.ethereum) {
            window._originalEthereum =
              window._originalEthereum || window.ethereum;
            window.ethereum = window.farcaster.ethereum;
            console.log("Set Farcaster ethereum as the primary provider");
          }

          return true;
        }
      } catch (err) {
        console.warn("Farcaster ethereum request failed:", err.message);
      }
    }

    // SECOND PRIORITY: Check if we're in Farcaster frame and use window.ethereum
    const isInFarcasterFrame =
      window.__FARCASTER_FRAME_CONTEXT__ ||
      (window.parent && window.parent !== window) ||
      document.referrer.includes("warpcast") ||
      navigator.userAgent.includes("Warpcast");

    if (isInFarcasterFrame && window.ethereum) {
      console.log("In Farcaster frame with window.ethereum available...");
      try {
        // First check if accounts are already available without prompting
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts && accounts.length > 0) {
          console.log(
            "✅ Using existing connection from window.ethereum:",
            accounts[0]
          );
          return true;
        }

        console.log("No accounts available, requesting connection...");
        const requestedAccounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        if (requestedAccounts && requestedAccounts.length > 0) {
          console.log(
            "✅ Connected to window.ethereum after request:",
            requestedAccounts[0]
          );
          return true;
        }
      } catch (err) {
        console.warn("window.ethereum request failed:", err.message);
      }
    }

    // LAST RESORT: Use wagmi connectors but try to avoid showing wallet selection UI
    try {
      const { connect, connectors } = await import("wagmi");

      // First priority: Farcaster specific connector
      const frameConnector = connectors.find((c) => c.id === "farcasterFrame");
      if (frameConnector) {
        try {
          console.log("Using Farcaster Frame connector silently...");
          await connect({
            connector: frameConnector,
            // This option helps avoid showing UI in some cases
            options: { silent: true },
          });
          return true;
        } catch (error) {
          console.warn("Farcaster connector failed:", error.message);
        }
      }
    } catch (error) {
      console.warn("Wagmi connection attempt failed:", error.message);
    }

    console.log("❌ All connection methods failed");
    return false;
  } catch (error) {
    console.error("Fatal wallet connection error:", error);
    return false;
  }
}
