import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req) {
  try {
    const payload = await req.json();
    console.log("📤 Forwarding request to 0xSplits API:", payload);

    // Forward the request to 0xSplits API
    try {
      const response = await axios.post(
        "https://api.0xsplits.xyz/v1/splits",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15000, // 15 second timeout
        }
      );

      console.log("📥 Response from 0xSplits API:", response.data);
      return NextResponse.json(response.data);
    } catch (axiosError) {
      // Handle Axios errors with more detail
      console.error("❌ 0xSplits API error details:", {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        message: axiosError.message,
      });

      // Return meaningful error response
      return NextResponse.json(
        {
          error: "Failed to create split contract via 0xSplits API",
          details:
            axiosError.response?.data || axiosError.message || "Unknown error",
          status: axiosError.response?.status || 500,
          fullError: axiosError.toString(),
        },
        { status: axiosError.response?.status || 500 }
      );
    }
  } catch (error) {
    // Handle general errors in the API route
    console.error("❌ General error in splits-reward API route:", error);
    return NextResponse.json(
      {
        error: "Failed to process split contract request",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
