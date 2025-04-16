"use client";

import { useAccount, useConnect } from "wagmi";

export default function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return <div>Connected as {address}</div>;
  }

  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      Connect Wallet
    </button>
  );
}
