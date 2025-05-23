import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("title") || "Quote Token";
  const description = searchParams.get("description") || "A quote on Quoted";
  const image =
    searchParams.get("image") || "https://quote-dusky.vercel.app/default.png";

  return NextResponse.json(
    {
      name,
      description,
      image,
      properties: { category: "social" },
    },
    {
      headers: { "Access-Control-Allow-Origin": "*" },
    }
  );
}
