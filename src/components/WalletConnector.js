// src/components/WalletConnector.js
"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div>
        <div>Connected as {address}</div>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          disabled={!connector.ready}
        >
          Connect with {connector.name}
          {isLoading &&
            pendingConnector?.id === connector.id &&
            " (connecting...)"}
        </button>
      ))}

      {error && <div style={{ color: "red" }}>{error.message}</div>}
    </div>
  );
}
