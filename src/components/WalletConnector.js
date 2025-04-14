"use client";

import { useAccount, useConnect } from "wagmi";

export default function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  const isFrame =
    typeof window !== "undefined" &&
    window?.navigator?.userAgent?.toLowerCase().includes("farcaster");

  if (isConnected) {
    return <div>🔗 Connected as {address}</div>;
  }

  if (isFrame && connectors.length === 0) {
    return <div>⚠️ Wallet connect not supported in this frame.</div>;
  }

  return connectors.length > 0 ? (
    <button
      disabled={isPending}
      onClick={() => connect({ connector: connectors[0] })}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  ) : (
    <div>No wallet connectors available</div>
  );
}
