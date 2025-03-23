"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import BokehScriptLoader from "../components/BokehScriptLoader";
import FarcasterFrameProvider from "./FarcasterFrameProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta property="og:title" content="Quote Card" />
        <meta
          property="og:description"
          content="Share and manage your favorite quotes!"
        />
        <meta
          property="og:image"
          content="https://quote-production-679a.up.railway.app/assets/phone.png"
        />
        <meta
          name="fc:frame"
          content={JSON.stringify({
            version: "next",
            imageUrl:
              "https://quote-production-679a.up.railway.app/assets/phone.png",
            button: {
              title: "Open Quote Card",
              action: {
                type: "launch_frame",
                name: "Quote Card",
                url: "https://quote-production-679a.up.railway.app/",
                splashImageUrl:
                  "https://quote-production-679a.up.railway.app/assets/phone.png",
                splashBackgroundColor: "#ffffff",
              },
            },
          })}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FarcasterFrameProvider>
          <BokehScriptLoader />
          {children}
        </FarcasterFrameProvider>
      </body>
    </html>
  );
}
