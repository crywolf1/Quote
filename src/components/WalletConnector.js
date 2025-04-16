"use client";

import { useFarcaster } from "./FarcasterFrameProvider";

export default function FarcasterConnectButton() {
  const {
    userData,
    loading,
    error,
    connectWallet,
    isConnected,
    tryGetUserData,
  } = useFarcaster();

  // Handle connect wallet button click
  const handleConnect = async () => {
    const connected = await connectWallet();
    if (connected) {
      await tryGetUserData();
    }
  };

  // If loading, show loading state
  if (loading) {
    return (
      <button
        className="bg-purple-500 text-white font-medium py-2 px-4 rounded-full flex items-center justify-center opacity-70 cursor-not-allowed"
        disabled
      >
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Connecting...
      </button>
    );
  }

  // If user data is available, show profile info
  if (userData && userData.username !== "Guest") {
    return (
      <div className="flex items-center space-x-2">
        <img
          src={userData.pfpUrl}
          alt={userData.username}
          className="w-8 h-8 rounded-full"
        />
        <span className="font-medium">
          {userData.displayName || userData.username}
        </span>
      </div>
    );
  }

  // If there's an error or no user data, show connect button
  return (
    <div className="flex flex-col items-center">
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <button
        onClick={handleConnect}
        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-full flex items-center justify-center transition-colors"
      >
        Connect Farcaster
      </button>
    </div>
  );
}
