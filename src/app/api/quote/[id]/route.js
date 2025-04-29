import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Quote from "@/lib/models/Quote";
import { unlink, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function PUT(req, { params }) {
  await dbConnect();
  try {
    const { id } = params;
    const { text, image } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Get old image path
    const oldQuote = await Quote.findById(id);
    let oldImagePath = null;
    if (oldQuote && oldQuote.image && oldQuote.image.startsWith("/quotes/")) {
      oldImagePath = path.join(process.cwd(), "public", oldQuote.image);
    }

    let imageUrl = undefined;
    if (image && image.startsWith("data:image")) {
      // Save new image file
      const base64Data = image.split(",")[1];
      const filename = `${uuidv4()}.png`;
      const filePath = path.join(process.cwd(), "public", "quotes", filename);
      await writeFile(filePath, Buffer.from(base64Data, "base64"));
      imageUrl = `/quotes/${filename}`;
    }

    const updateFields = { text };
    if (imageUrl) updateFields.image = imageUrl;

    const updatedQuote = await Quote.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    // Delete old image if a new one was saved
    if (imageUrl && oldImagePath) {
      try {
        await unlink(oldImagePath);
      } catch (e) {
        // Ignore if file doesn't exist
      }
    }

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

    // Delete image file if it exists
    if (deletedQuote.image && deletedQuote.image.startsWith("/quotes/")) {
      const imagePath = path.join(process.cwd(), "public", deletedQuote.image);
      try {
        await unlink(imagePath);
      } catch (e) {
        // Ignore if file doesn't exist
      }
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
