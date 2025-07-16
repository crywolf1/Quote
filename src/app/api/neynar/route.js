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
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        console.error(
          `❌ Farcaster Hub API error for FID ${fid}, status: ${res.status}`
        );

        // For FID 819757, return a better fallback profile
        if (fid === "819757") {
          return NextResponse.json({
            users: [
              {
                fid: parseInt(fid),
                username: "user819757",
                display_name: "Farcaster User", // Better display name
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

        // Generic fallback for other FIDs
        return NextResponse.json({
          users: [
            {
              fid: parseInt(fid),
              username: `user${fid}`,
              display_name: "Farcaster User", // Changed from "User ${fid}"
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
      console.log("✅ Farcaster Hub API response:", data);

      if (!data.messages || !data.messages.length) {
        console.warn("⚠️ No messages found for FID:", fid);

        // Return a better fallback when no data is found
        return NextResponse.json({
          users: [
            {
              fid: parseInt(fid),
              username: `user${fid}`,
              display_name: "Farcaster User", // Better than "User ${fid}"
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

      return NextResponse.json({ users: [userData] });
    } catch (error) {
      console.error("💥 Error fetching user by FID:", error);

      // Better error fallback
      return NextResponse.json({
        users: [
          {
            fid: parseInt(fid),
            username: `user${fid}`,
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
              eth_addresses: [],
            },
            custody_address: null,
          },
        ],
      });
    }
  }

  // Handle address-based lookup
  if (address) {
    console.log("📍 Address-based lookup for:", address);

    return NextResponse.json({
      users: [
        {
          fid: null,
          username: `${address.slice(0, 6)}...${address.slice(-4)}`,
          display_name: "Wallet User", // Better than showing address
          pfp_url: "https://warpcast.com/avatar.png",
          profile: {
            bio: {
              text: "Connected wallet user",
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

// Enhanced helper function to transform Farcaster Hub data
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

  console.log(`📊 Processing ${messages.length} messages for FID ${fid}`);

  // Process each message to extract user data
  messages.forEach((message, index) => {
    console.log(`Message ${index}:`, message);

    if (!message.data || !message.data.userDataBody) {
      console.log(`Skipping message ${index} - no userDataBody`);
      return;
    }

    const userDataBody = message.data.userDataBody;
    const type = userDataBody.type;
    const value = userDataBody.value;

    console.log(`Processing: ${type} = ${value}`);

    switch (type) {
      case "USER_DATA_TYPE_USERNAME":
        userData.username = value;
        console.log("✅ Set username:", value);
        break;
      case "USER_DATA_TYPE_DISPLAY":
        userData.display_name = value;
        console.log("✅ Set display_name:", value);
        break;
      case "USER_DATA_TYPE_PFP":
        userData.pfp_url = value;
        console.log("✅ Set pfp_url:", value);
        break;
      case "USER_DATA_TYPE_BIO":
        userData.profile.bio.text = value;
        console.log("✅ Set bio:", value);
        break;
      default:
        console.log(`Unknown type: ${type}`);
    }
  });

  // Enhanced fallback logic
  if (!userData.display_name && userData.username) {
    userData.display_name = userData.username;
    console.log("✅ Using username as display_name:", userData.username);
  }

  if (!userData.display_name && !userData.username) {
    userData.username = `user${fid}`;
    userData.display_name = "Farcaster User"; // Generic but better than "User ${fid}"
    console.log("⚠️ No username/display_name found, using fallback");
  }

  // Fix avatar loading
  if (!userData.pfp_url) {
    userData.pfp_url = "https://warpcast.com/avatar.png";
  }

  // Validate and fix image URLs
  if (userData.pfp_url && !userData.pfp_url.startsWith("http")) {
    userData.pfp_url = `https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/${userData.pfp_url}/rectcrop3`;
  }

  console.log("✅ Final user data:", userData);
  return userData;
}
