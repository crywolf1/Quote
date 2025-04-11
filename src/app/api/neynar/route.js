import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { fid } = req.nextUrl.searchParams;
    console.log("Received FID:", fid);

    if (!fid) {
      return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    // Simulate fetching user data from an external service (e.g., Neynar API)
    const userData = await fetchUserDataFromService(fid);

    if (!userData) {
      console.error("No user data found for FID:", fid);
      return NextResponse.json(
        { error: "No user data found" },
        { status: 404 }
      );
    }

    // Log the fetched data
    console.log("Fetched user data:", userData);

    return NextResponse.json({
      username: userData.username || "Guest",
      pfpUrl: userData.pfp_url || "/default-avatar.jpg", // Adjust to use pfp_url from response
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
  const response = await fetch(`https://api.neynar.com/users/${fid}`);
  if (response.ok) {
    const data = await response.json();
    console.log("Fetched data from Neynar API:", data);
    return data.users[0]; // Assuming the response structure is { users: [...] }
  }
  console.error("Failed to fetch user data from Neynar API");
  return null;
}
