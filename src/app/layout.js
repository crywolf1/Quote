"use client";

import { FarcasterFrameProvider } from "../components/FarcasterFrameProvider";
import WagmiProviderWrapper from "../components/WagmiProviderWrapper";
import { NeynarContextProvider, Theme } from "@neynar/react";
import "@neynar/react/dist/style.css";
import { AuthKitProvider } from "@farcaster/auth-kit";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="fc:frame"
          content='{
            "version": "next",
            "imageUrl": "https://quote-dusky.vercel.app/assets/icon.png",
            "button": {
              "title": "Quote",
              "action": {
                "type": "launch_frame",
                "name": "Quote",
                "url": "https://quote-dusky.vercel.app/",
                "splashImageUrl": "https://quote-dusky.vercel.app/assets/icon.png",
                "splashBackgroundColor": "#eeccff"
              }
            }
          }'
          data-rh="true"
        />
      </head>
      <body>
        <WagmiProviderWrapper>
          <FarcasterFrameProvider>
            <NeynarContextProvider
              settings={{
                clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "",
                defaultTheme: Theme.Light,
                eventsCallbacks: {
                  onAuthSuccess: () => console.log("Authentication successful"),
                  onSignout: () => console.log("Signed out"),
                },
              }}
            >
              <AuthKitProvider>{children}</AuthKitProvider>
            </NeynarContextProvider>
          </FarcasterFrameProvider>
        </WagmiProviderWrapper>
      </body>
    </html>
  );
}
