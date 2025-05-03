import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const quote = searchParams.get("quote") || "";
    const username = searchParams.get("username") || "";
    const displayName = searchParams.get("displayName") || "";
    const pfpUrl = searchParams.get("pfpUrl") || "";

    // Fallback if no avatar
    const actualPfpUrl =
      pfpUrl || "https://placehold.co/64x64/4c00ff/white?text=Q";

    return new ImageResponse(
      (
        <div
          style={{
            width: 400,
            height: 220,
            background: "#4c00ff",
            color: "#fff",
            display: "flex", // This is important!
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <img
              src={actualPfpUrl}
              width="64"
              height="64"
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: 12,
                marginTop: 16,
              }}
            />
            <div
              style={{
                fontWeight: 600,
                fontSize: 20,
                marginBottom: 8,
                display: "flex",
              }}
            >
              {displayName}
            </div>
            <div style={{ fontSize: 18, textAlign: "center", display: "flex" }}>
              "{quote}" — {username}
            </div>
          </div>
        </div>
      ),
      {
        width: 400,
        height: 220,
        // Add these to help with debugging
        debug: false,
        headers: {
          "Cache-Control": "no-cache, no-store",
        },
      }
    );
  } catch (error) {
    console.error("OG Image error:", error);

    // Return a simple error image
    return new ImageResponse(
      (
        <div
          style={{
            width: 400,
            height: 220,
            background: "#4c00ff",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div style={{ fontSize: 20, textAlign: "center", display: "flex" }}>
            Error generating image
          </div>
        </div>
      ),
      { width: 400, height: 220 }
    );
  }
}
