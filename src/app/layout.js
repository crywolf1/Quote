import FarcasterFrameProvider from "./FarcasterFrameProvider";

export const metadata = {
  title: "Quote Card",
  description: "A simple quote card app",
};

export default function RootLayout({ children }) {
  const railwayUrl = "https://yourapp.up.railway.app"; // Replace with your Railway URL

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Farcaster Frame Metadata */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={`${railwayUrl}/preview.png`} />
        <meta property="fc:frame:button:1" content="Open Quote Card" />
        <meta property="fc:frame:button:1:action" content="post" />
        <meta
          property="fc:frame:button:1:target"
          content={`${railwayUrl}/api/frame`}
        />
      </head>
      <body>
        <FarcasterFrameProvider>{children}</FarcasterFrameProvider>
      </body>
    </html>
  );
}
