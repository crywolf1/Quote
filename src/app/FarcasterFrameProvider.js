"use client";

import { useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";

export default function FarcasterFrameProvider({ children }) {
  useEffect(() => {
    const init = async () => {
      const context = await FrameSDK.context;
      console.log("Frame context:", context);

      // Signal readiness to Warpcast
      setTimeout(() => {
        FrameSDK.actions.ready();
      }, 500);
    };
    init();
  }, []);

  return <>{children}</>;
}
