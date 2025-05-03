export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) return new Response("No url", { status: 400 });
  
    const imageRes = await fetch(url);
    const arrayBuffer = await imageRes.arrayBuffer();
    return new Response(arrayBuffer, {
      status: imageRes.status,
      headers: {
        "Content-Type": imageRes.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }