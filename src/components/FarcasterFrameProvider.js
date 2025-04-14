"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FrameValidationData, getFrameMessage } from "@farcaster/frame-sdk";

const FarcasterContext = createContext();

export const FarcasterFrameProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fid = urlParams.get("fid");

        if (!fid) {
          console.log("FID not found, using guest.");
          return setUserData(null);
        }

        const res = await fetch(`/api/neynar?fid=${fid}`);
        const data = await res.json();
        if (data && data.user) {
          setUserData({
            username: data.user.username,
            pfpUrl: data.user.pfp_url,
          });
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error("Failed to fetch Farcaster user data:", error);
        setUserData(null);
      }
    };

    fetchUserData();
  }, []);

  return (
    <FarcasterContext.Provider value={{ userData }}>
      {children}
    </FarcasterContext.Provider>
  );
};

export const useFarcaster = () => useContext(FarcasterContext);