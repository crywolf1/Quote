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
    let background = "linear-gradient(to right, #485563, #29323c)"; // Updated dark gradient
    let contentBg = "rgba(41, 50, 60, 0.85)"; // Slightly adjusted to match new colors
    let contentBorder = "rgba(60, 70, 80, 0.8)";
    let accentGlow = "rgba(90, 90, 255, 0.08)";
    let patternChar = "Z";
    let textColor = "#fff";
    let userInfoBg = "rgba(35, 45, 55, 0.7)"; // Darker, matching the new gradient
    let brandingBg = "rgba(35, 45, 55, 0.7)";
    let pfpBorder = "rgba(255, 255, 255, 0.5)";

    // Apply style variations
    if (style === "purple") {
      // Using the new purple gradient as requested
      const primaryPurple = "#6a3093"; // Starting color - deep purple
      const brightPurple = "#a044ff"; // Ending color - bright violet

      // Derive additional colors for UI elements
      const darkPurple = "#5a2883"; // Darker shade for content
      const lightPurple = "#b366ff"; // Lighter shade for accents

      background = `linear-gradient(to right, ${primaryPurple}, ${brightPurple})`;
      contentBg = "rgba(106, 48, 147, 0.85)"; // Using primary purple with transparency
      contentBorder = "rgba(176, 102, 255, 0.4)"; // Light purple border
      accentGlow = "rgba(160, 68, 255, 0.2)"; // Purple glow
      patternChar = "✦"; // Star-like character
      textColor = "#f8f7ff"; // Very light purple/white for text
      userInfoBg = "rgba(90, 40, 131, 0.75)"; // Deeper purple for user section
      brandingBg = "rgba(90, 40, 131, 0.75)";
      pfpBorder = lightPurple; // Light purple for profile border
    } else if (style === "harvey") {
      const primaryGreen = "rgb(31, 64, 55)"; // #1f4037 - dark forest green
      const lightGreen = "rgb(153, 242, 200)"; // #99f2c8 - mint green
      const midGreen = "rgb(92, 153, 128)"; // A middle tone for accents

      background = `linear-gradient(to right, ${primaryGreen}, ${lightGreen})`;
      contentBg = "rgba(31, 64, 55, 0.85)";
      contentBorder = "rgba(153, 242, 200, 0.4)";
      accentGlow = "rgba(153, 242, 200, 0.2)";
      patternChar = "❃"; // Flower-like character for nature theme
      textColor = "#ffffff"; // White for readability
      userInfoBg = "rgba(31, 64, 55, 0.8)"; // Dark green for user section
      brandingBg = "rgba(31, 64, 55, 0.8)";
      pfpBorder = lightGreen; // Light green for profile border
    } else if (style === "blue") {
      // Using a slightly darker blue gradient as requested
      const lightBlue = "#0072ff"; // Darkened fromrgb(0, 132, 255)
      const darkBlue = "#0068e8"; // Darkened from #0072ff

      // Derive additional colors for UI elements
      const midBlue = "#008ce6"; // Darkened middle tone
      const accentBlue = "#5cc6f5"; // Slightly darker accent

      background = `linear-gradient(to right, ${lightBlue}, ${darkBlue})`;
      contentBg = "rgba(0, 140, 230, 0.85)"; // Using darkened mid blue
      contentBorder = "rgba(92, 198, 245, 0.4)"; // Slightly darker border
      accentGlow = "rgba(92, 198, 245, 0.25)"; // Darkened glow
      patternChar = "◇"; // Diamond character
      textColor = "#ffffff"; // White text for readability
      userInfoBg = "rgba(0, 104, 232, 0.75)"; // Darker blue for user section
      brandingBg = "rgba(0, 104, 232, 0.75)";
      pfpBorder = accentBlue; // Light blue for profile border
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
                width: 30 + (i % 20),
                height: 30 + (i % 20),
                color: "rgba(0, 0, 0, 0.1)",
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
                top: 20,
                left: 30,
                fontSize: 120,
                opacity: 0.15,
                fontFamily: "Georgia, serif",
                display: "flex",
                color: style === "white" ? "#0066cc" : textColor,
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

            {/* User info section */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
                background: userInfoBg,
                padding: "12px 24px",
                borderRadius: 50,
                boxShadow:
                  style === "white" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
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
                  background: brandingBg,
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

    // Keep the fallback as is - no changes needed
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
