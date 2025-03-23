import { NextResponse } from "next/server";

export async function GET(req) {
  const host = req.headers.get("host");
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta property="og:title" content="Quote Card" /><meta property="og:description" content="Interact to see and add quotes!" /><meta property="og:image" content="https://quote-production-679a.up.railway.app/assets/phone.png" /><meta property="fc:frame" content="v2" /><meta property="fc:frame:image" content="https://quote-production-679a.up.railway.app/assets/phone.png" /><meta property="fc:frame:button:1" content="Start" /><meta property="fc:frame:post_url" content="https://${host}/api/frame" /></head><body></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(req) {
  try {
    const host = req.headers.get("host");
    const body = await req.json();
    const { untrustedData } = body || {};
    const { fid, buttonIndex, inputText } = untrustedData || {};

    if (!fid) {
      console.error("No fid provided in untrustedData:", body);
      return new NextResponse("Missing fid", { status: 400 });
    }

    // Fetch user data from Neynar with error handling
    let username = "Guest";
    let pfpUrl =
      "https://quote-production-679a.up.railway.app/assets/phone.png";
    try {
      const neynarResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: {
            accept: "application/json",
            api_key: process.env.NEYNAR_API_KEY || "",
          },
        }
      );
      if (!neynarResponse.ok) {
        console.error(
          "Neynar API error:",
          neynarResponse.status,
          await neynarResponse.text()
        );
        throw new Error("Failed to fetch user data from Neynar");
      }
      const neynarData = await neynarResponse.json();
      if (neynarData.users && neynarData.users.length > 0) {
        username = neynarData.users[0].username || "Guest";
        pfpUrl = neynarData.users[0].pfp_url || pfpUrl;
      } else {
        console.warn("No users found in Neynar response:", neynarData);
      }
    } catch (error) {
      console.error("Error fetching Neynar data:", error.message);
      // Continue with defaults
    }

    // Fetch quotes with error handling
    let quotes = [];
    try {
      const quotesResponse = await fetch(`https://${host}/api/quote`, {
        method: "GET",
      });
      if (!quotesResponse.ok) {
        console.error(
          "Quotes API error:",
          quotesResponse.status,
          await quotesResponse.text()
        );
        throw new Error("Failed to fetch quotes");
      }
      const quotesData = await quotesResponse.json();
      quotes = quotesData.quotes || [];
    } catch (error) {
      console.error("Error fetching quotes:", error.message);
      // Continue with empty quotes
    }

    let currentIndex = untrustedData?.state?.currentIndex || 0;
    if (!quotes.length) currentIndex = 0;
    else if (buttonIndex === 1)
      currentIndex = (currentIndex - 1 + quotes.length) % quotes.length;
    else if (buttonIndex === 2)
      currentIndex = (currentIndex + 1) % quotes.length;

    if (buttonIndex === 3 && inputText) {
      try {
        const addQuoteResponse = await fetch(`https://${host}/api/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText }),
        });
        if (!addQuoteResponse.ok) {
          console.error(
            "Add quote error:",
            addQuoteResponse.status,
            await addQuoteResponse.text()
          );
          throw new Error("Failed to add quote");
        }
        const updatedQuotesResponse = await fetch(`https://${host}/api/quote`, {
          method: "GET",
        });
        const updatedQuotes = (await updatedQuotesResponse.json()).quotes || [];
        return new NextResponse(
          `<!DOCTYPE html><html><head><meta property="og:title" content="Hey, ${username}!" /><meta property="og:description" content="Quote added: ${inputText}" /><meta property="og:image" content="${pfpUrl}" /><meta property="fc:frame" content="v2" /><meta property="fc:frame:image" content="${pfpUrl}" /><meta property="fc:frame:button:1" content="⬅️ Previous" /><meta property="fc:frame:button:2" content="Next ➡️" /><meta property="fc:frame:button:3" content="Add Quote" /><meta property="fc:frame:button:4" content="Manage Quotes" /><meta property="fc:frame:input:text" content="Enter your quote" /><meta property="fc:frame:post_url" content="https://${host}/api/frame" /><meta property="fc:frame:state" content="${JSON.stringify(
            { currentIndex: updatedQuotes.length - 1, fid }
          )}" /></head><body></body></html>`,
          { status: 200, headers: { "Content-Type": "text/html" } }
        );
      } catch (error) {
        console.error("Error adding quote:", error.message);
        // Continue with current state
      }
    }

    const currentQuote = quotes[currentIndex]?.text || "No quotes yet.";
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta property="og:title" content="Hey, ${username}!" /><meta property="og:description" content="${currentQuote}" /><meta property="og:image" content="${pfpUrl}" /><meta property="fc:frame" content="v2" /><meta property="fc:frame:image" content="${pfpUrl}" /><meta property="fc:frame:button:1" content="⬅️ Previous" /><meta property="fc:frame:button:2" content="Next ➡️" /><meta property="fc:frame:button:3" content="Add Quote" /><meta property="fc:frame:button:4" content="Manage Quotes" /><meta property="fc:frame:input:text" content="Enter your quote" /><meta property="fc:frame:post_url" content="https://${host}/api/frame" /><meta property="fc:frame:post_url:4" content="https://${host}/frame-ui?fid=${fid}" /><meta property="fc:frame:state" content="${JSON.stringify(
        { currentIndex, fid }
      )}" /></head><body></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("POST /api/frame error:", error.message, error.stack);
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta property="og:title" content="Error" /><meta property="og:description" content="Something went wrong. Try again." /><meta property="og:image" content="https://quote-production-679a.up.railway.app/assets/phone.png" /><meta property="fc:frame" content="v2" /><meta property="fc:frame:image" content="https://quote-production-679a.up.railway.app/assets/phone.png" /><meta property="fc:frame:button:1" content="Retry" /><meta property="fc:frame:post_url" content="https://${req.headers.get(
        "host"
      )}/api/frame" /></head><body></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
