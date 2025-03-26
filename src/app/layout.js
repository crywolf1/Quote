import FarcasterFrameProvider from "./FarcasterFrameProvider";

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
      "imageUrl": "https://quote-production-679a.up.railway.app/assets/phone.png",
      "button":{
        "title": "quote",
        "action": {
          "type": "launch_frame",
          "name": "quote",
          "url": "https://quote-production-679a.up.railway.app/",
          "splashImageUrl": "https://quote-production-679a.up.railway.app/assets/phone.png",
          "splashBackgroundColor": "#131313"
        }
      }
    }'
          data-rh="true"
        />
      </head>
      <body>
        <FarcasterFrameProvider>{children}</FarcasterFrameProvider>
      </body>
    </html>
  );
}
