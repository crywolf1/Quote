"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StylePreviewer() {
  const router = useRouter();
  
  useEffect(() => {
    // If we're in the browser, redirect to the HTML file
    if (typeof window !== "undefined") {
      window.location.href = "/style-previewer.html";
    }
  }, []);

  return <div>Redirecting to style previewer...</div>;
}