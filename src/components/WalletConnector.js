"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState } from "react";
import { base } from "wagmi/chains";

export default function WalletConnector() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isLoading, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState(null);

  // Fallback to connector.chainId if useNetwork is unavailable
  const chainId = connector?.chainId || null;

  if (isConnected && chainId !== base.id) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <p className="wrong-network">Please switch to the Base network.</p>
        <button onClick={() => disconnect()} className="disconnect-button">
          Disconnect
        </button>
      </div>
    );
  }

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
          onClick={() => {
            setError(null);
            connect({ connector, chainId: base.id }).catch((err) => {
              console.error("Wallet connection error:", err);
              setError({
                message: "Failed to connect wallet. Please try again.",
              });
            });
          }}
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
