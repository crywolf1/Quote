import FarcasterFrameProvider from "./FarcasterFrameProvider";

export const metadata = {
  title: "Quote Card",
  description: "A simple quote card app",
};

export default function RootLayout({ children }) {
  const frameData = {
    version: "next",
    imageUrl: "https://quote-production-679a.up.railway.app/assets/phone.png",
    buttons: [
      {
        title: "Load Profile",
        action: {
          type: "post",
          url: "https://quote-production-679a.up.railway.app/api/frame",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
      </head>
      <body>
        <FarcasterFrameProvider>{children}</FarcasterFrameProvider>
      </body>
    </html>
  );
}
