import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db"; // Assuming your db.js is inside utils
import User from "../../../lib/models/User"; // Assuming you have a User model set up in Mongoose

// Mock function to fetch user data from Farcaster
const fetchUserFromFarcaster = async (userId) => {
  try {
    // Replace with actual Farcaster API request to get user data
    const res = await fetch(`https://api.farcaster.xyz/users/${userId}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error("Failed to fetch data from Farcaster");
    }

    return data;
  } catch (error) {
    console.error("Error fetching data from Farcaster:", error);
    throw new Error("Error fetching data from Farcaster");
  }
};

export async function GET(req) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Get the user ID from the request (you might want to adjust this based on how you identify users)
    const { userId } = req.query; // Assuming you send userId in the query params

    // Fetch user data from Farcaster
    const farcasterUserData = await fetchUserFromFarcaster(userId);

    // Optional: Fetch user data from your MongoDB if you store anything additional
    const dbUser = await User.findOne({ userId });

    // Combine MongoDB data with Farcaster data (if needed)
    const userData = {
      ...farcasterUserData,
      ...dbUser.toObject(), // Merge MongoDB user data (if applicable)
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.error(); // Return error if something goes wrong
  }
}
