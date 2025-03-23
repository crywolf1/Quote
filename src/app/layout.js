"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import BokehScriptLoader from "../components/BokehScriptLoader";

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
          content="quote-production-679a.up.railway.app/assets/phone.png"
        />
        <meta property="fc:frame" content="v2" />
        <meta
          property="fc:frame:image"
          content="quote-production-679a.up.railway.app/assets/phone.png"
        />
        <meta property="fc:frame:button:1" content="Start" />
        <meta
          property="fc:frame:post_url"
          content="quote-production-679a.up.railway.app/api/frame"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BokehScriptLoader />
        {children}
      </body>
    </html>
  );
}
