"use client";

import { useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";

export default function FarcasterFrameProvider({ children }) {
  useEffect(() => {
    const init = async () => {
      const context = await FrameSDK.context;
      console.log("Provider context:", JSON.stringify(context));
      setTimeout(() => {
        FrameSDK.actions.ready();
        console.log("Frame SDK ready signaled");
      }, 500);
    };
    init();
  }, []);

  return <>{children}</>;
}
