// NeynarLogin.js - This is your SIWN integration

import { useEffect } from "react";

const NeynarLogin = () => {
  useEffect(() => {
    // Ensure the Neynar script is loaded dynamically
    const script = document.createElement("script");
    script.src = "https://neynarxyz.github.io/siwn/raw/1.2.0/index.js";
    script.async = true;
    document.body.appendChild(script);

    // Cleanup script on unmount
    return () => document.body.removeChild(script);
  }, []);

  const onSignInSuccess = (data) => {
    console.log("Sign-in successful! Data:", data);
    // Handle the received signer data here (signer_uuid and fid)
    // Save the signer_uuid securely in state or backend (for write actions)
  };

  return (
    <div>
      <div
        className="neynar_signin"
        data-client_id="YOUR_NEYNAR_CLIENT_ID"
        data-success-callback="onSignInSuccess"
        data-theme="dark" // You can customize the theme
      ></div>
    </div>
  );
};

export default NeynarLogin;
