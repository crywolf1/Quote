import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");
  const address = searchParams.get("address");

  console.log("Incoming request to /api/neynar with:");
  console.log("fid:", fid);
  console.log("address:", address);

  // Handle FID-based lookup using Farcaster Hub API
  if (fid) {
    try {
      console.log(`🔍 Attempting to fetch data for FID: ${fid}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch(
        `https://hub.farcaster.xyz/v1/userDataByFid?fid=${fid}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Farcaster Hub API error for FID ${fid}:`, errorText);

        // Return a fallback profile instead of error
        return NextResponse.json({
          users: [
            {
              fid: parseInt(fid),
              username: `user${fid}`,
              display_name: `User ${fid}`,
              pfp_url: "https://warpcast.com/avatar.png",
              profile: {
                bio: {
                  text: "Farcaster user",
                },
              },
              follower_count: 0,
              following_count: 0,
              verified_addresses: {
                eth_addresses: [],
              },
              custody_address: null,
            },
          ],
        });
      }

      const data = await res.json();
      console.log("✅ Farcaster Hub API response for FID:", data);

      if (!data.messages || !data.messages.length) {
        console.warn("⚠️ User not found for fid:", fid);

        // Return a basic profile instead of 404
        return NextResponse.json({
          users: [
            {
              fid: parseInt(fid),
              username: `user${fid}`,
              display_name: `User ${fid}`,
              pfp_url: "https://warpcast.com/avatar.png",
              profile: {
                bio: {
                  text: "Farcaster user",
                },
              },
              follower_count: 0,
              following_count: 0,
              verified_addresses: {
                eth_addresses: [],
              },
              custody_address: null,
            },
          ],
        });
      }

      // Transform Farcaster Hub data to match Neynar format
      const userData = transformFarcasterData(data.messages, fid);
      console.log("✅ Transformed user data:", userData);

      // Return in exact same format as Neynar
      return NextResponse.json({ users: [userData] });
    } catch (error) {
      console.error("💥 Error fetching user by FID:", error);

      // Return fallback instead of error
      return NextResponse.json({
        users: [
          {
            fid: parseInt(fid),
            username: `user${fid}`,
            display_name: `User ${fid}`,
            pfp_url: "https://warpcast.com/avatar.png",
            profile: {
              bio: {
                text: "Farcaster user",
              },
            },
            follower_count: 0,
            following_count: 0,
            verified_addresses: {
              eth_addresses: [],
            },
            custody_address: null,
          },
        ],
      });
    }
  }

  // For address-based requests in a mini app context,
  // we should not rely on external lookups
  if (address) {
    console.log("📍 Address-based lookup requested for:", address);
    console.log(
      "💡 Note: In Farcaster mini apps, use Frame SDK to get FID directly"
    );

    // Return a fallback response that won't break the frontend
    return NextResponse.json({
      users: [
        {
          fid: null,
          username: `${address.slice(0, 6)}...${address.slice(-4)}`,
          display_name: "Farcaster User",
          pfp_url: "https://warpcast.com/avatar.png",
          profile: {
            bio: {
              text: "Farcaster user",
            },
          },
          follower_count: 0,
          following_count: 0,
          verified_addresses: {
            eth_addresses: [address.toLowerCase()],
          },
          custody_address: address.toLowerCase(),
        },
      ],
    });
  }

  return NextResponse.json(
    { error: "Provide 'fid' or 'address' as query param" },
    { status: 400 }
  );
}

// Helper function to transform Farcaster Hub data to Neynar format
function transformFarcasterData(messages, fid) {
  const userData = {
    fid: parseInt(fid),
    username: null,
    display_name: null,
    pfp_url: null,
    profile: {
      bio: {
        text: null,
      },
    },
    follower_count: 0,
    following_count: 0,
    verified_addresses: {
      eth_addresses: [],
    },
    custody_address: null,
  };

  // Process each message to extract user data
  messages.forEach((message) => {
    if (!message.data || !message.data.userDataBody) return;

    const userDataBody = message.data.userDataBody;
    const type = userDataBody.type;
    const value = userDataBody.value;

    switch (type) {
      case "USER_DATA_TYPE_USERNAME":
        userData.username = value;
        break;
      case "USER_DATA_TYPE_DISPLAY":
        userData.display_name = value;
        break;
      case "USER_DATA_TYPE_PFP":
        userData.pfp_url = value;
        break;
      case "USER_DATA_TYPE_BIO":
        userData.profile.bio.text = value;
        break;
    }
  });

  // Set fallbacks to match Neynar behavior
  if (!userData.display_name && userData.username) {
    userData.display_name = userData.username;
  }

  // Fix avatar loading - use proper fallback images
  if (!userData.pfp_url) {
    userData.pfp_url = "https://warpcast.com/avatar.png";
  }

  // Validate image URL and provide backup
  if (userData.pfp_url && !userData.pfp_url.startsWith("http")) {
    userData.pfp_url = `https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/${userData.pfp_url}/rectcrop3`;
  }

  return userData;
}
