"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState, useEffect } from "react";
import { base } from "wagmi/chains";

export default function WalletConnector({ onWalletConnect }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState(null);

  const handleConnect = async (connector) => {
    setError(null);
    try {
      await connect({ connector, chainId: base.id });
      if (onWalletConnect) {
        onWalletConnect(address); // Pass the connected address to the parent component
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError({ message: "Failed to connect wallet. Please try again." });
    }
  };

  useEffect(() => {
    if (isConnected && onWalletConnect) {
      onWalletConnect(address); // Automatically fetch user data if already connected
    }
  }, [isConnected, address, onWalletConnect]);

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button onClick={() => disconnect()} className="disconnect-button">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-buttons">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => handleConnect(connector)}
          disabled={!connector.ready || isLoading}
          className={`connect-button ${
            isLoading && connector.id === pendingConnector?.id ? "loading" : ""
          }`}
        >
          {isLoading && connector.id === pendingConnector?.id ? (
            <span className="spinner"></span>
          ) : (
            `Connect ${connector.name}`
          )}
        </button>
      ))}
      {error && <div className="error-message">{error.message}</div>}
    </div>
  );
}
