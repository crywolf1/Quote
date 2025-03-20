import { NextResponse } from "next/server";
import { Frame, FrameButton } from "@farcaster/frame-sdk";

export async function GET() {
  const frame = new Frame({
    image: "https://your-image-url.com/frame.png", // Replace with a dynamic or static image
    postUrl: "https://your-site.com/api/frame-action",
    buttons: [new FrameButton("Get Started")],
  });

  return NextResponse.json(frame);
}
