import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const quote = searchParams.get("quote") || "";
    const username = searchParams.get("username") || "";
    const displayName = searchParams.get("displayName") || "";
    const pfpUrl = searchParams.get("pfpUrl") || "";
    const title = searchParams.get("title") || "";
    const style = searchParams.get("style") || "dark"; // Add style parameter with default

    // Higher resolution placeholder
    const actualPfpUrl =
      pfpUrl || "https://placehold.co/256x256/222222/white?text=Q";

    // Improved quote truncation for longer quotes
    const safeQuote = quote.length > 240 ? quote.slice(0, 240) + "..." : quote;
    const isTokenSymbol = title.startsWith("$");
    const displayTitle = isTokenSymbol ? title : `$${title.toUpperCase()}`;

    // Calculate font size based on quote length
    const quoteFontSize =
      safeQuote.length > 180
        ? 26
        : safeQuote.length > 120
        ? 30
        : safeQuote.length > 60
        ? 35
        : 40;

    // Dimensions for OG image
    const width = 800;
    const height = 420;

    // Generate a unique pattern for each quote using username as seed
    const patternSeed = username?.length || 5;
    const patternDensity = 5 + (patternSeed % 4); // Fewer elements

    // Style-specific configurations
    let background = "linear-gradient(to right, #141414, #222222)";
    let contentBg = "rgba(30, 30, 30, 0.8)";
    let contentBorder = "rgba(50, 50, 50, 0.8)";
    let accentGlow = "rgba(90,90,255,0.08)";
    let patternChar = "Z";

    // Apply style variations
    if (style === "pink") {
      background = "linear-gradient(to right, #ff80bf, #ff1a8c)";
      contentBg = "rgba(50, 20, 40, 0.85)";
      contentBorder = "rgba(255, 153, 204, 0.4)";
      accentGlow = "rgba(255, 102, 178, 0.2)";
      patternChar = "♥";
    } else if (style === "green") {
      background = "linear-gradient(to right, #145a32, #196f3d)";
      contentBg = "rgba(20, 50, 30, 0.85)";
      contentBorder = "rgba(46, 139, 87, 0.4)";
      accentGlow = "rgba(88, 214, 141, 0.15)";
      patternChar = "☘";
    }

    return new ImageResponse(
      (
        <div
          style={{
            width,
            height,
            background: background,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Styled pattern elements */}
          {Array.from({ length: patternDensity }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 30 + (i % 20),
                height: 30 + (i % 20),
                color: "rgba(255, 255, 255, 0.1)",
                top: `${(i * 37 + patternSeed * 11) % 100}%`,
                left: `${(i * 23 + patternSeed * 7) % 100}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24 + (i % 16),
                opacity: 0.1 + (i % 10) / 30,
              }}
            >
              {patternChar}
            </div>
          ))}

          {/* Subtle glow accent */}
          <div
            style={{
              position: "absolute",
              width: "40%",
              height: "40%",
              background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`,
              top: "30%",
              left: "30%",
              filter: "blur(60px)",
              display: "flex",
            }}
          />

          {/* Content container with elegant border */}
          <div
            style={{
              width: "90%",
              height: "85%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 24,
              padding: "36px 40px 44px 40px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
              background: contentBg,
              backdropFilter: "blur(5px)",
              border: `1px solid ${contentBorder}`,
              position: "relative",
              zIndex: 10,
            }}
          >
            {/* Elegant quote marks */}
            <div
              style={{
                position: "absolute",
                top: 20,
                left: 30,
                fontSize: 120,
                opacity: 0.15,
                fontFamily: "Georgia, serif",
                display: "flex",
              }}
            >
              "
            </div>

            {/* Quote text - with dynamic font size and word break */}
            <div
              style={{
                fontSize: quoteFontSize,
                fontWeight: 700,
                textAlign: "center",
                lineHeight: 1.4,
                maxWidth: "90%",
                marginBottom: 20,
                display: "flex",
                flexDirection: "column",
                textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              <span style={{ display: "block" }}>{safeQuote}</span>
            </div>

            {/* User info section */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
                background: "rgba(20,20,20,0.7)",
                padding: "12px 24px",
                borderRadius: 50,
              }}
            >
              <img
                src={actualPfpUrl}
                width="64"
                height="64"
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid rgba(255,255,255,0.5)",
                  marginRight: 16,
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    display: "block",
                  }}
                >
                  {displayName}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    opacity: 0.9,
                    display: "block",
                  }}
                >
                  @{username}
                </span>
              </div>
            </div>

            {/* Branding */}
            <div
              style={{
                position: "absolute",
                bottom: 20,
                right: 30,
                fontSize: 18,
                fontWeight: 700,
                opacity: 0.6,
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  background: "rgba(20,20,20,0.7)",
                  padding: "4px 12px",
                  borderRadius: 12,
                  display: "flex",
                }}
              >
                {displayTitle}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width,
        height,
        debug: false,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=604800",
          "Content-Type": "image/png",
        },
        quality: 80,
      }
    );
  } catch (error) {
    console.error("OG Image error:", error);

    return new ImageResponse(
      (
        <div
          style={{
            width: 800,
            height: 420,
            background: "#141414",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            quoted
          </div>
          <div
            style={{
              fontSize: 24,
              opacity: 0.8,
              display: "flex",
            }}
          >
            Share your thoughts with the world
          </div>
        </div>
      ),
      {
        width: 800,
        height: 420,
        quality: 80,
        headers: {
          "Cache-Control": "public, max-age=86400",
          "Content-Type": "image/png",
        },
      }
    );
  }
}
