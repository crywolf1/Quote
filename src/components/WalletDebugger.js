"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

export default function WalletDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [walletInfo, setWalletInfo] = useState({});
  const { address, isConnected, connector } = useAccount();
  const { connectors } = useConnect();

  useEffect(() => {
    // Collect wallet information
    const info = {
      isConnected,
      connectedAddress: address,
      currentConnector: connector?.id,
      availableConnectors: connectors.map((c) => c.id),
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
  }, [address, isConnected, connector, connectors]);

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

      <div style={{ marginBottom: "8px" }}>
        <div>Current: {walletInfo.currentConnector || "none"}</div>
        <div>
          Available: {walletInfo.availableConnectors?.join(", ") || "none"}
        </div>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <div>Providers:</div>
        {walletInfo.providerDetails &&
          Object.entries(walletInfo.providerDetails).map(([key, value]) => (
            <div key={key} style={{ color: value ? "#4caf50" : "#f44336" }}>
              {key}: {value ? "Yes" : "No"}
            </div>
          ))}
      </div>

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
