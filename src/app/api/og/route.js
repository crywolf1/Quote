import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const quote = searchParams.get("quote") || "";
  const username = searchParams.get("username") || "";
  const displayName = searchParams.get("displayName") || "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const rawPfpUrl = searchParams.get("pfpUrl") || "";

  const isProd = process.env.NODE_ENV === "production";
  const pfpUrl = isProd
    ? rawPfpUrl
    : `${baseUrl}/api/proxy?url=${encodeURIComponent(rawPfpUrl)}`;

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
          src={pfpUrl}
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
}
