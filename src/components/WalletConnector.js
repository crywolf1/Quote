"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState } from "react";

// Wallet configuration
const walletConfig = {
  appName: "Quote App",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: ["base"],
  frameConfig: {
    version: "next",
    image: "https://quote-production-679a.up.railway.app/icon.png",
    buttons: [
      {
        label: "Connect Wallet",
        action: "post",
      },
    ],
  },
};

export default function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading, pendingConnector } = useConnect();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState(null);

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
            connect({ connector, chainId: 8453 }); // Base chain ID
          }}
          disabled={!connector.ready || isLoading}
          className={`connect-button ${
            isLoading && connector.id === pendingConnector?.id ? "loading" : ""
          }`}
        >
          {isLoading && connector.id === pendingConnector?.id
            ? "Connecting..."
            : `Connect ${connector.name}`}
        </button>
      ))}
      {error && <div className="error-message">{error.message}</div>}
    </div>
  );
}
