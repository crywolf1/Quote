export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return new Response("No url", { status: 400 });

  try {
    const imageRes = await fetch(url);
    if (!imageRes.ok) {
      return new Response(`Failed to fetch image: ${imageRes.statusText}`, {
        status: imageRes.status,
      });
    }
    const arrayBuffer = await imageRes.arrayBuffer();
    return new Response(arrayBuffer, {
      status: imageRes.status,
      headers: {
        "Content-Type": imageRes.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return new Response("Proxy error", { status: 500 });
  }
}
