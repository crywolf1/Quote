"use client";

import { useState, useEffect, useRef } from "react";

export default function WalletDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [walletInfo, setWalletInfo] = useState({});
  const [wagmiAvailable, setWagmiAvailable] = useState(false);

  // Default empty values
  const accountRef = useRef({});
  const connectRef = useRef({ connectors: [] });

  // Check WagmiProvider availability on mount only
  useEffect(() => {
    let mounted = true;

    const checkWagmiProvider = async () => {
      try {
        // Dynamically import wagmi hooks to avoid errors when component is rendered
        // outside of WagmiProvider context during server-side rendering
        const { useConfig, useAccount, useConnect } = await import("wagmi");

        // Attempt to get the Wagmi config
        const Config = useConfig;

        if (!Config) {
          return;
        }

        // If we get here without error, WagmiProvider is available
        if (mounted) {
          setWagmiAvailable(true);

          // Now it's safe to use wagmi hooks via the imported modules
          const Account = useAccount;
          const Connect = useConnect;

          if (Account && Connect) {
            const accountData = Account();
            const connectData = Connect();

            accountRef.current = accountData || {};
            connectRef.current = connectData || { connectors: [] };
          }
        }
      } catch (error) {
        if (mounted) {
          // We're not in a WagmiProvider context
          console.warn(
            "WalletDebugger: Not in WagmiProvider context - checked once",
            error.message
          );
          setWagmiAvailable(false);
        }
      }
    };

    // Check once on mount
    checkWagmiProvider();

    return () => {
      mounted = false;
    };
  }, []);

  // Extract values safely
  const address = accountRef.current?.address;
  const isConnected = accountRef.current?.isConnected;
  const connector = accountRef.current?.connector;
  const connectors = connectRef.current?.connectors || [];

  // Update wallet information when dependencies change
  useEffect(() => {
    // Collect wallet information
    const info = {
      wagmiAvailable,
      isConnected: !!isConnected,
      connectedAddress: address || null,
      currentConnector: connector?.id || null,
      availableConnectors: Array.isArray(connectors)
        ? connectors.map((c) => c?.id || "unknown").filter(Boolean)
        : [],
      providerDetails: {
        hasFarcasterProvider:
          typeof window !== "undefined" && !!window.farcaster?.ethereum,
        hasEthereumProvider: typeof window !== "undefined" && !!window.ethereum,
        hasRainbowProvider:
          typeof window !== "undefined" && !!window.ethereum?.isRainbow,
        hasCoinbaseProvider:
          typeof window !== "undefined" && !!window.ethereum?.isCoinbaseWallet,
        hasMetaMaskProvider:
          typeof window !== "undefined" && !!window.ethereum?.isMetaMask,
      },
      environment: {
        isWarpcast:
          typeof window !== "undefined" &&
          (navigator.userAgent.includes("Warpcast") ||
            document.referrer.includes("warpcast.com")),
        isFrameContext:
          typeof window !== "undefined" &&
          (!!window.__FARCASTER_FRAME_CONTEXT__ || window.parent !== window),
        url: typeof window !== "undefined" ? window.location.href : null,
      },
    };

    setWalletInfo(info);
  }, [address, isConnected, connector, connectors, wagmiAvailable]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: "fixed",
          bottom: "10px",
          right: "10px",
          zIndex: 9999,
          padding: "5px",
          background: "#333",
          color: "white",
          border: "none",
          borderRadius: "5px",
          opacity: 0.7,
          fontSize: "12px",
        }}
      >
        Debug
      </button>
    );
  }

  // Rest of your component remains the same
  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 9999,
        background: "#222",
        color: "#eee",
        padding: "10px",
        borderRadius: "5px",
        maxWidth: "400px",
        maxHeight: "300px",
        overflow: "auto",
        fontSize: "12px",
        fontFamily: "monospace",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <h4 style={{ margin: 0 }}>Wallet Debugger</h4>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      {/* Warning when WagmiProvider is not available */}
      {!walletInfo.wagmiAvailable && (
        <div style={{ color: "#f44336", marginBottom: "8px" }}>
          ⚠️ WagmiProvider not available! Some features will be limited.
        </div>
      )}

      {/* Connected status */}
      <div style={{ marginBottom: "8px" }}>
        <span style={{ color: walletInfo.isConnected ? "#4caf50" : "#f44336" }}>
          {walletInfo.isConnected ? "✓ Connected" : "✗ Disconnected"}
        </span>
        {walletInfo.connectedAddress && (
          <div style={{ wordBreak: "break-all" }}>
            Address: {walletInfo.connectedAddress}
          </div>
        )}
      </div>

      {/* Connector info */}
      <div style={{ marginBottom: "8px" }}>
        <div>Current: {walletInfo.currentConnector || "none"}</div>
        <div>
          Available: {walletInfo.availableConnectors?.join(", ") || "none"}
        </div>
      </div>

      {/* Provider details */}
      <div style={{ marginBottom: "8px" }}>
        <div>Providers:</div>
        {walletInfo.providerDetails &&
          Object.entries(walletInfo.providerDetails).map(([key, value]) => (
            <div key={key} style={{ color: value ? "#4caf50" : "#f44336" }}>
              {key}: {value ? "Yes" : "No"}
            </div>
          ))}
      </div>

      {/* Environment info */}
      <div>
        <div>Environment:</div>
        {walletInfo.environment &&
          Object.entries(walletInfo.environment).map(([key, value]) => (
            <div
              key={key}
              style={{ wordBreak: key === "url" ? "break-all" : "normal" }}
            >
              {key}:{" "}
              {typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : String(value)}
            </div>
          ))}
      </div>
    </div>
  );
}
