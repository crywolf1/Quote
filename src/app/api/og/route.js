import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const quote = searchParams.get("quote") || "";
    const username = searchParams.get("username") || "";
    const displayName = searchParams.get("displayName") || "";

    // Always use direct URL (both in prod and dev)
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
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <img
            src={actualPfpUrl}
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: 12,
              marginTop: 16,
              display: "block",
            }}
          />
          <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 8 }}>
            {displayName}
          </div>
          <div style={{ fontSize: 18, textAlign: "center" }}>
            "{quote}" — {username}
          </div>
        </div>
      ),
      { width: 400, height: 220 }
    );
  } catch (error) {
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
          <div style={{ fontSize: 20, textAlign: "center" }}>
            Error generating image
          </div>
        </div>
      ),
      { width: 400, height: 220 }
    );
  }
}
