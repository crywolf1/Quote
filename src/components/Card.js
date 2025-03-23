"use client";

import { useState, useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";

export default function Card() {
  const [userData, setUserData] = useState({
    username: "Guest",
    pfpUrl: "/default-avatar.jpg",
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Starting user data fetch...");

        // Check environment variable
        const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "";
        console.log("API Key present:", !!apiKey);
        if (!apiKey) {
          console.error("NEXT_PUBLIC_NEYNAR_API_KEY is not set!");
          setUserData({
            username: "No API Key",
            pfpUrl: "/default-avatar.jpg",
          });
          return;
        }

        // Hardcode FID for testing
        const fid = 344203; // Your FID
        console.log("Using hardcoded FID:", fid);

        // Fetch from Neynar API
        const neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
          {
            headers: {
              accept: "application/json",
              api_key: apiKey,
            },
          }
        );
        console.log("Neynar API status:", neynarResponse.status);
        const neynarText = await neynarResponse.text();
        console.log("Neynar API raw response:", neynarText);

        if (!neynarResponse.ok) {
          console.error("Neynar API error:", neynarText);
          setUserData({ username: "API Error", pfpUrl: "/default-avatar.jpg" });
          return;
        }

        const neynarData = JSON.parse(neynarText);
        console.log("Neynar API parsed response:", JSON.stringify(neynarData));
        const user = neynarData.users?.[0];
        if (user) {
          const newUserData = {
            username: user.username || "Guest",
            pfpUrl: user.pfp_url || "/default-avatar.jpg",
          };
          setUserData(newUserData);
          console.log(
            "User data set:",
            newUserData.username,
            newUserData.pfpUrl
          );
        } else {
          console.warn("No users in Neynar response:", neynarData);
          setUserData({
            username: "No User Data",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error.message, error.stack);
        setUserData({ username: "Fetch Error", pfpUrl: "/default-avatar.jpg" });
      }
    };

    fetchUserData();
  }, []);

  return (
    <div>
      <h1>Welcome, {userData.username}!</h1>
      <img
        src={userData.pfpUrl}
        alt="Avatar"
        style={{ width: "100px", height: "100px" }}
      />
    </div>
  );
}
