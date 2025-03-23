import { NextResponse } from "next/server";

export async function GET(req) {
  const host = req.headers.get("host");
  return new NextResponse(
    `<!DOCTYPE html>
     <html>
       <head>
         <meta property="og:title" content="Quote Card" />
         <meta property="og:description" content="Interact to see and add quotes!" />
         <meta property="og:image" content="https://quote-production-679a.up.railway.app/assets/phone.png" />
         <meta property="fc:frame" content="v2" />
         <meta property="fc:frame:image" content="https://quote-production-679a.up.railway.app/assets/phone.png" />
         <meta property="fc:frame:button:1" content="Start" />
         <meta property="fc:frame:post_url" content="https://${host}/api/frame" />
       </head>
       <body></body>
     </html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(req) {
  const body = await req.json();
  const { untrustedData } = body;
  const { fid, buttonIndex, inputText } = untrustedData || {};
  const host = req.headers.get("host");

  const neynarResponse = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
    {
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API_KEY || "",
      },
    }
  );
  const neynarData = await neynarResponse.json();
  const user = neynarData.users[0] || {};
  const username = user.username || "Guest";
  const pfpUrl =
    user.pfp_url ||
    "https://quote-production-679a.up.railway.app/assets/phone.png";

  const quotesResponse = await fetch(`https://${host}/api/quote`, {
    method: "GET",
  });
  const { quotes } = await quotesResponse.json();

  let currentIndex = untrustedData?.state?.currentIndex || 0;
  if (!quotes.length) currentIndex = 0;
  else if (buttonIndex === 1)
    currentIndex = (currentIndex - 1 + quotes.length) % quotes.length;
  else if (buttonIndex === 2) currentIndex = (currentIndex + 1) % quotes.length;

  if (buttonIndex === 3 && inputText) {
    await fetch(`https://${host}/api/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: inputText }),
    });
    const updatedQuotesResponse = await fetch(`https://${host}/api/quote`, {
      method: "GET",
    });
    const updatedQuotes = await updatedQuotesResponse.json();
    return new NextResponse(
      `<!DOCTYPE html>
       <html>
         <head>
           <meta property="og:title" content="Hey, ${username}!" />
           <meta property="og:description" content="Quote added: ${inputText}" />
           <meta property="og:image" content="${pfpUrl}" />
           <meta property="fc:frame" content="v2" />
           <meta property="fc:frame:image" content="${pfpUrl}" />
           <meta property="fc:frame:button:1" content="⬅️ Previous" />
           <meta property="fc:frame:button:2" content="Next ➡️" />
           <meta property="fc:frame:button:3" content="Add Quote" />
           <meta property="fc:frame:button:4" content="Manage Quotes" />
           <meta property="fc:frame:input:text" content="Enter your quote" />
           <meta property="fc:frame:post_url" content="https://${host}/api/frame" />
           <meta property="fc:frame:state" content="${JSON.stringify({
             currentIndex: updatedQuotes.quotes.length - 1,
             fid,
           })}" />
         </head>
       </html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  const currentQuote = quotes[currentIndex]?.text || "No quotes yet.";
  return new NextResponse(
    `<!DOCTYPE html>
     <html>
       <head>
         <meta property="og:title" content="Hey, ${username}!" />
         <meta property="og:description" content="${currentQuote}" />
         <meta property="og:image" content="${pfpUrl}" />
         <meta property="fc:frame" content="v2" />
         <meta property="fc:frame:image" content="${pfpUrl}" />
         <meta property="fc:frame:button:1" content="⬅️ Previous" />
         <meta property="fc:frame:button:2" content="Next ➡️" />
         <meta property="fc:frame:button:3" content="Add Quote" />
         <meta property="fc:frame:button:4" content="Manage Quotes" />
         <meta property="fc:frame:input:text" content="Enter your quote" />
         <meta property="fc:frame:post_url" content="https://${host}/api/frame" />
         <meta property="fc:frame:post_url:4" content="https://${host}/frame-ui?fid=${fid}" />
         <meta property="fc:frame:state" content="${JSON.stringify({
           currentIndex,
           fid,
         })}" />
       </head>
       <body></body>
     </html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
