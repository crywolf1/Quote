import { NextResponse } from "next/server";

// Use this endpoint to handle the user data fetch
export async function GET(request) {
  try {
    // Extract the FID from the request URL's query parameters
    const url = new URL(request.url);
    const fid = url.searchParams.get("fid");

    if (!fid) {
      return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    // The Neynar API endpoint to fetch user data
    const neynerApiUrl = `https://api.neynar.com/users/${fid}`; // This is an example URL, replace with the correct one
    const apiKey = "YOUR_API_KEY"; // Add your actual API Key here if needed

    // Fetch the user data from Neynar API
    const response = await fetch(neynerApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`, // If authentication is needed
        "Content-Type": "application/json",
      },
    });

    // Handle any API errors
    if (!response.ok) {
      throw new Error(
        `Error fetching user data from Neynar: ${response.statusText}`
      );
    }

    // Parse the JSON response
    const data = await response.json();

    // Check if users are available in the response
    if (!data.users || data.users.length === 0) {
      return NextResponse.json(
        { error: "No user data found" },
        { status: 404 }
      );
    }

    // Extract the first user from the response
    const user = data.users[0];

    // Prepare the response with user details
    const userData = {
      username: user.username || "Guest", // Default to "Guest" if no username is available
      pfpUrl: user.pfp_url || "/default-avatar.jpg", // Default to a placeholder image if no profile picture URL is available
    };

    // Return the user data
    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error:", error);
    // Return a 500 error if something goes wrong
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
