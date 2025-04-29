import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Quote from "@/lib/models/Quote";
import cloudinary from "cloudinary";
import { v4 as uuidv4 } from "uuid";
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PUT(req, { params }) {
  await dbConnect();
  try {
    const { id } = params;
    const { text, image } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Find old quote
    const oldQuote = await Quote.findById(id);
    let imageUrl = oldQuote.image;

    // If new image provided, upload to Cloudinary
    if (image && image.startsWith("data:image")) {
      // Optionally delete old image from Cloudinary
      if (imageUrl && imageUrl.includes("cloudinary.com")) {
        // Extract public_id from URL
        const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];
        await cloudinary.v2.uploader.destroy(`quotes/${publicId}`);
      }
      // Upload new image
      const uploadRes = await cloudinary.v2.uploader.upload(image, {
        folder: "quotes",
        public_id: uuidv4(),
        overwrite: true,
      });
      imageUrl = uploadRes.secure_url;
    }

    const updatedQuote = await Quote.findByIdAndUpdate(
      id,
      { text, image: imageUrl },
      { new: true }
    );
    if (!updatedQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    return NextResponse.json(updatedQuote, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update quote" },
      { status: 500 }
    );
  }
}
export async function DELETE(req, { params }) {
  await dbConnect();
  try {
    const { id } = params;
    const deletedQuote = await Quote.findByIdAndDelete(id);
    if (!deletedQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Delete image from Cloudinary if it exists
    if (deletedQuote.image && deletedQuote.image.includes("cloudinary.com")) {
      const publicId = deletedQuote.image.split("/").slice(-1)[0].split(".")[0];
      await cloudinary.v2.uploader.destroy(`quotes/${publicId}`);
    }

    return NextResponse.json(
      { message: "Quote deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete quote" },
      { status: 500 }
    );
  }
}
