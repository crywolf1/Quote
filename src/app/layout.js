import FarcasterFrameProvider from "./FarcasterFrameProvider";

export const metadata = {
  title: "Quote Card",
  description: "A simple quote card app for Farcaster",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Initial Frame */}
        <meta property="fc:frame" content="vNext" />
        <meta
          property="fc:frame:image"
          content="https://quote-production-679a.up.railway.app/assets/phone.png"
        />
        <meta property="fc:frame:button:1" content="Open Quote Card" />
        <meta
          property="fc:frame:post_url"
          content="https://quote-production-679a.up.railway.app/api/frame"
        />
      </head>
      <body>
        <FarcasterFrameProvider>{children}</FarcasterFrameProvider>
      </body>
    </html>
  );
}
