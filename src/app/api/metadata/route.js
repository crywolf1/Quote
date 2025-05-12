import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req) {
  try {
    const metadata = await req.json();

    if (!metadata.name || !metadata.image) {
      return NextResponse.json(
        { error: "Name and image are required" },
        { status: 400 }
      );
    }

    // Generate a unique ID for the metadata file
    const id = uuidv4();
    const dirPath = path.join(process.cwd(), "public", "metadata");
    const filePath = path.join(dirPath, `${id}.json`);

    // Create directory if it doesn't exist
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (err) {
      // Ignore if directory already exists
    }

    // Write the metadata to a file
    await writeFile(filePath, JSON.stringify(metadata, null, 2));

    // Return the URL for the metadata
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const url = `${baseUrl}/metadata/${id}.json`;

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Metadata creation error:", error);
    return NextResponse.json(
      { error: "Failed to create metadata" },
      { status: 500 }
    );
  }
}
