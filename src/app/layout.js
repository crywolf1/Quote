import FarcasterMiniAppProvider from "./FarcasterMiniAppProvider";

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

        {/* Farcaster Mini App metadata */}
        <meta property="og:title" content="Quote Card" />
        <meta
          property="og:description"
          content="A simple quote card app for Farcaster"
        />
        <meta
          property="og:image"
          content="https://quote-production-679a.up.railway.app/assets/phone.png"
        />

        {/* Farcaster Mini App / Frame specific tags */}
        <meta property="fc:frame" content="vNext" />
        <meta
          property="fc:frame:image"
          content="https://quote-production-679a.up.railway.app/assets/phone.png"
        />
        <meta property="fc:frame:button:1" content="Open Quote App" />
        <meta
          property="fc:frame:post_url"
          content="https://quote-production-679a.up.railway.app/api/frame"
        />

        {/* Additional mini app metadata */}
        <meta property="fc:frame:state" content="" />
        <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
      </head>
      <body>
        <FarcasterMiniAppProvider>{children}</FarcasterMiniAppProvider>
      </body>
    </html>
  );
}
