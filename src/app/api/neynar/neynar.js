import Neynar from "@neynar/nodejs-sdk";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Initialize Neynar with your API key
    const neynar = new Neynar({
      apiKey: process.env.NEXT_PUBLIC_NEYNAR_API_KEY, // Use environment variable for API key
    });

    await neynar.init();
    console.log("Neynar initialized");

    // Fetch user data
    const user = await neynar.getUser();
    console.log("Neynar user data:", user);

    if (user && user.username) {
      return res.status(200).json({
        username: user.username,
        pfpUrl: user.pfpUrl || "/default-avatar.jpg",
      });
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user data from Neynar:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
