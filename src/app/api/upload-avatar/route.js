import { NextResponse } from "next/server";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  const { imageUrl } = await req.json();
  try {
    const uploadRes = await cloudinary.v2.uploader.upload(imageUrl, {
      folder: "avatars",
      overwrite: true,
    });
    return NextResponse.json({ secure_url: uploadRes.secure_url });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
