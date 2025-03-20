"use client"; // Add the "use client" directive at the top of the file

import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import BokehScriptLoader from "../components/BokehScriptLoader"; // ✅ Import the script loader
import { useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk"; // Import the Farcaster SDK

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Farcaster frame provider
function FarcasterFrameProvider({ children }) {
  useEffect(() => {
    const load = async () => {
      setTimeout(() => {
        FrameSDK.actions.ready(); // Ensure the frame SDK is ready
      }, 500);
    };

    load();
  }, []);

  return <>{children}</>;
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Add Farcaster Meta Tags */}
        <meta
          name="fc:frame"
          content='{
            "version": "next",
            "imageUrl": "https://quote-production-679a.up.railway.app/assets/phone.png",
            "button": {
              "title": "Quote",
              "action": {
                "type": "launch_frame",
                "name": "Quote",
                "url": "https://quote-production-679a.up.railway.app",
                "splashImageUrl": "https://quote-production-679a.up.railway.app/assets/phone.png",
                "splashBackgroundColor": "#131313"
              }
            }
          }'
          data-rh="true"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FarcasterFrameProvider>
          <BokehScriptLoader /> {/* ✅ Load the script separately */}
          {children}
        </FarcasterFrameProvider>
      </body>
    </html>
  );
}
