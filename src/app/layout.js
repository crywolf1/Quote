import FarcasterFrameProvider from "./FarcasterFrameProvider";
import { sdk } from "@farcaster/frame-sdk"; // Import the SDK
import { useEffect, useState } from "react";

export const metadata = {
  title: "Quote Card",
  description: "A simple quote card app",
};

// Custom provider to manage auth state
function AuthenticatedFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Initialize SDK and attempt sign-in on mount
    const initializeAuth = async () => {
      try {
        await sdk.init(); // Initialize the SDK
        const user = await sdk.signin(); // Attempt sign-in
        setUserData({
          username: user.username || "Guest",
          pfpUrl: user.pfpUrl || "/default-avatar.jpg",
        });
      } catch (error) {
        console.error("Sign-in failed:", error);
        setUserData({ username: "Guest", pfpUrl: "/default-avatar.jpg" }); // Fallback
      }
    };
    initializeAuth();
  }, []);

  return (
    <FarcasterFrameProvider userData={userData}>
      {children}
    </FarcasterFrameProvider>
  );
}

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
            "button": {
              "title": "quote",
              "action": {
                "type": "post",
                "name": "Quote",
                "url": "https://quote-production-679a.up.railway.app/",
                "splashImageUrl": "https://quote-production-679a.up.railway.app/phone.png",
                "splashBackgroundColor": "#131313"
              }
            }
          }'
          data-rh="true"
        />
      </head>
      <body>
        <AuthenticatedFrameProvider>{children}</AuthenticatedFrameProvider>
      </body>
    </html>
  );
}