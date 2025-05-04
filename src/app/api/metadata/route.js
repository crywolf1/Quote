export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Untitled Quote";
  const imageUrl =
    searchParams.get("image") ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/assets/icon.png`;

  const metadata = {
    name: title,
    description: `Quote token for “${title}”`,
    image: imageUrl,
    properties: { category: "social" },
  };

  return new Response(JSON.stringify(metadata), {
    headers: { "Content-Type": "application/json"},
  });
}
