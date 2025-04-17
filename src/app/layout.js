import { FarcasterFrameProvider } from "../components/FarcasterFrameProvider";
import WagmiProviderWrapper from "../components/WagmiProviderWrapper";

export const metadata = {
  title: "Quote Card",
  description: "A simple quote card app",
};

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
          <FarcasterFrameProvider>{children}</FarcasterFrameProvider>
          
        </WagmiProviderWrapper>
      </body>
    </html>
  );
}
