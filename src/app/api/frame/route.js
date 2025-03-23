import { NextResponse } from "next/server";

export async function GET(req) {
  const host = req.headers.get("host");
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta property="og:title" content="Quote Card API" /><meta property="og:description" content="API endpoint for Quote Card frame" /><meta property="og:image" content="https://quote-production-679a.up.railway.app/assets/phone.png" /></head><body><p>Quote Card API is running</p></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(req) {
  try {
    const host = req.headers.get("host");
    const body = await req.json();
    const { untrustedData } = body || {};
    const { fid } = untrustedData || {};

    // Optional: Add logic later (e.g., fetch user data or quotes)
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta property="og:title" content="Quote Card" /><meta property="og:description" content="API POST received" /><meta property="og:image" content="https://quote-production-679a.up.railway.app/assets/phone.png" /></head><body><p>FID: ${
        fid || "none"
      }</p></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("POST /api/frame error:", error.message);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
