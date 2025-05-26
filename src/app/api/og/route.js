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
      safeQuote.length < 50
        ? 80 // Very short quotes get extremely large text
        : safeQuote.length < 100
        ? 66 // Short quotes get very large text
        : safeQuote.length < 150
        ? 56 // Medium quotes get large text
        : safeQuote.length < 200
        ? 48 // Longer quotes get medium-large text
        : 40; // Longest quotes (200-240 chars) still get readable text
    // UPDATED: Dimensions for OG image with 3:2 aspect ratio
    const width = 1200;
    const height = 800; // 1200 ÷ 1.5 = 800 (3:2 ratio)

    // Generate a unique pattern for each quote using username as seed
    const patternSeed = username?.length || 5;
    const patternDensity = 5 + (patternSeed % 4); // Fewer elements

    // Style-specific configurations
    let background = "linear-gradient(to right, #485563, #29323c)"; // Updated dark gradient
    let contentBg = "rgba(41, 50, 60, 0.85)"; // Slightly adjusted to match new colors
    let contentBorder = "rgba(60, 70, 80, 0.8)";
    let accentGlow = "rgba(90, 90, 255, 0.08)";
    let patternChar = "Z";
    let textColor = "#fff";
    let userInfoBg = "rgba(35, 45, 55, 0.7)"; // Darker, matching the new gradient
    let brandingBg = "rgba(35, 45, 55, 0.7)";
    let pfpBorder = "rgba(255, 255, 255, 0.5)";

    // Apply style variations - no changes needed
    if (style === "purple") {
      // Your existing purple style
      const primaryPurple = "#6a3093";
      const brightPurple = "#a044ff";
      const darkPurple = "#5a2883";
      const lightPurple = "#b366ff";

      background = `linear-gradient(to right, ${primaryPurple}, ${brightPurple})`;
      contentBg = "rgba(106, 48, 147, 0.85)";
      contentBorder = "rgba(176, 102, 255, 0.4)";
      accentGlow = "rgba(160, 68, 255, 0.2)";
      patternChar = "✦";
      textColor = "#f8f7ff";
      userInfoBg = "rgba(90, 40, 131, 0.75)";
      brandingBg = "rgba(90, 40, 131, 0.75)";
      pfpBorder = lightPurple;
    } else if (style === "harvey") {
      // Your existing harvey style
      const primaryGreen = "rgb(31, 64, 55)";
      const lightGreen = "rgb(153, 242, 200)";
      const midGreen = "rgb(92, 153, 128)";

      background = `linear-gradient(to right, ${primaryGreen}, ${lightGreen})`;
      contentBg = "rgba(31, 64, 55, 0.85)";
      contentBorder = "rgba(153, 242, 200, 0.4)";
      accentGlow = "rgba(153, 242, 200, 0.2)";
      patternChar = "❃";
      textColor = "#ffffff";
      userInfoBg = "rgba(31, 64, 55, 0.8)";
      brandingBg = "rgba(31, 64, 55, 0.8)";
      pfpBorder = lightGreen;
    } else if (style === "blue") {
      // Updated blue style with new gradient
      const brightBlue = "#2e2eff"; // rgba(46, 46, 255, 1)
      const darkBlue = "#002ccc"; // rgba(0, 44, 204, 1)
      const accentBlue = "#0052ff"; // rgba(0, 82, 255, 1)
      const lightBlue = "#5c8eff"; // Lighter complement for accents

      background = `linear-gradient(110deg, ${brightBlue} 0%, ${darkBlue} 53%, ${accentBlue} 100%)`;
      contentBg = "rgba(0, 44, 204, 0.85)";
      contentBorder = "rgba(46, 46, 255, 0.4)";
      accentGlow = "rgba(0, 82, 255, 0.25)";
      patternChar = "◇";
      textColor = "#ffffff";
      userInfoBg = "rgba(0, 44, 204, 0.75)";
      brandingBg = "rgba(0, 44, 204, 0.75)";
      pfpBorder = lightBlue;
    }

    return new ImageResponse(
      (
        <div
          style={{
            width,
            height,
            background: background,
            color: textColor,
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
                width: 40 + (i % 20),
                height: 40 + (i % 20),
                color: "rgba(0, 0, 0, 0.1)",
                top: `${(i * 37 + patternSeed * 11) % 100}%`,
                left: `${(i * 23 + patternSeed * 7) % 100}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32 + (i % 16),
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
              filter: "blur(80px)",
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
              borderRadius: 32,
              padding: "40px 50px 50px 50px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
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
                top: 30,
                left: 40,
                fontSize: 200,
                opacity: 0.15,
                fontFamily: "Georgia, serif",
                display: "flex",
                color: style === "white" ? "#0066cc" : textColor,
              }}
            >
              "
            </div>

            {/* Quote text - larger content area for 3:2 aspect ratio */}
            <div
              style={{
                fontSize: quoteFontSize,
                fontWeight: 700,
                textAlign: "center",
                lineHeight: 1.4, // Slightly tighter line height for larger text
                maxWidth: "92%", // Slightly wider to accommodate larger text
                marginBottom: 60, // More bottom margin for balance
                marginTop: 30, // More top margin for balance
                padding: "0 20px",
                display: "flex",
                flexDirection: "column",
                textShadow:
                  style === "white"
                    ? "0 1px 1px rgba(0,0,0,0.1)"
                    : "0 1px 2px rgba(0,0,0,0.2)",
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              <span style={{ display: "block" }}>{safeQuote}</span>
            </div>

            {/* User info section - Positioned at bottom-left */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: userInfoBg,
                padding: "12px 24px",
                borderRadius: 50,
                boxShadow:
                  style === "white" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                position: "absolute",
                bottom: 30,
                left: 40,
              }}
            >
              <img
                src={actualPfpUrl}
                width="64"
                height="64"
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `3px solid ${pfpBorder}`,
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
                    fontSize: 26,
                    fontWeight: 700,
                    display: "block",
                  }}
                >
                  {displayName}
                </span>
                <span
                  style={{
                    fontSize: 20,
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
                bottom: 30,
                right: 40,
                fontSize: 20,
                fontWeight: 700,
                opacity: 0.6,
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  background: brandingBg,
                  padding: "6px 16px",
                  borderRadius: 16,
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

    // Update fallback image to match 3:2 ratio as well
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 800,
            background: "#141414",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 32,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
              marginBottom: 30,
            }}
          >
            quoted
          </div>
          <div
            style={{
              fontSize: 32,
              opacity: 0.8,
              display: "flex",
            }}
          >
            Share your thoughts with the world
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
        quality: 80,
        headers: {
          "Cache-Control": "public, max-age=86400",
          "Content-Type": "image/png",
        },
      }
    );
  }
}
