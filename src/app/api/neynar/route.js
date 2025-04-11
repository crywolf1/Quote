// src/app/api/neynar/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { fid } = req.nextUrl.searchParams;
    console.log("Received FID:", fid);

    if (!fid) {
      return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    // Fetch user data from Neynar or external service using FID
    const userData = await fetchUserDataFromService(fid); // Replace with actual fetching logic

    if (!userData) {
      console.error("No user data found for FID:", fid);
      return NextResponse.json(
        { error: "No user data found" },
        { status: 404 }
      );
    }

    console.log("Fetched user data:", userData);
    return NextResponse.json({
      username: userData.username || "Guest",
      pfpUrl: userData.pfp_url || "/default-avatar.jpg",
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}

async function fetchUserDataFromService(fid) {
  // Simulate fetching user data from an external API (e.g., Neynar API)
  // Replace with actual API call to Neynar or another service
  const response = await fetch(`https://api.neynar.com/users/${fid}`);
  if (response.ok) {
    const data = await response.json();
    return data.users[0]; // Example: returning the first user object
  }
  return null;
}
