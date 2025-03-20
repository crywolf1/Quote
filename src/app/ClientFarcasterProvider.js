"use client"; // Mark as client-side

import { useEffect } from "react";
// Import the FarcasterProvider
import BokehScriptLoader from "../components/BokehScriptLoader"; // Import the BokehScriptLoader
import FrameSDK from "@farcaster/frame-sdk"; // Import the Farcaster SDK
function FarcasterFrameProvider({ children }) {
  useEffect(() => {
    const load = async () => {
      // Initialize the Farcaster SDK
      FrameSDK.actions.ready();
    };
    load();
  }, []);

  return (
    <>
      <BokehScriptLoader /> {/* ✅ Load the script separately */}
      {children}
    </>
  );
}

export default FarcasterFrameProvider;
