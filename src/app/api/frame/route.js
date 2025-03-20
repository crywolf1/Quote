import { NextResponse } from "next/server";
import { Frame, FrameButton } from "@farcaster/frame-sdk";

export async function GET() {
  // Create a Frame object
  const frame = new Frame({
    image: "/assets/phone.png", // Replace with your actual image URL
    postUrl: "https://quote-production-679a.up.railway.app/", // Action URL for the frame button
    buttons: [
      new FrameButton({
        label: "Get Started", // Text for the button
        actionUrl: "https://quote-production-679a.up.railway.app/", // Redirect URL when the button is clicked
      }),
    ],
  });

  // Return the frame as a JSON response
  return NextResponse.json(frame);
}
