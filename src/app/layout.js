import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import BokehScriptLoader from "../components/BokehScriptLoader"; // ✅ Import the script loader

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Server-side metadata export
export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

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
              "title": "quote",
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
        {/* Render Client Component */}
        {children}
      </body>
    </html>
  );
}
