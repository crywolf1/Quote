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
      "imageUrl": "https://uniframe.org/images/1200x630_Rich_Link_Preview_Image.png",
      "button":{
        "title": "quote",
        "action": {
          "type": "post",
          "name": "Uniframe",
          "url": "https://uniframe.org/swap",
          "splashImageUrl": "https://uniframe.org/favicon.png",
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
