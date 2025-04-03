import { NextResponse } from "next/server";

export async function GET() {
  const railwayUrl = "quote-production-679a.up.railway.app"; // Replace with your Railway URL

  return new NextResponse(
    `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${railwayUrl}/assets/phone.png" />
          <meta property="fc:frame:button:1" content="Open Quote Card" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:target" content="${railwayUrl}/api/frame" />
        </head>
        <body>Farcaster Mini App</body>
      </html>
    `,
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}

export async function POST(request) {
  const railwayUrl = "quote-production-679a.up.railway.app"; // Replace with your Railway URL
  const body = await request.json();
  const { untrustedData } = body;
  const fid = untrustedData?.fid || "Guest";

  // Redirect to the main page with FID
  return NextResponse.redirect(`${railwayUrl}/?fid=${fid}`, 307);
}
