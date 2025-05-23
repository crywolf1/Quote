"use client";

import { useEffect } from "react";

export default function StylePreviewerPage() {
  useEffect(() => {
    // Redirect to the HTML file
    if (typeof window !== "undefined") {
      window.location.href = "/style-previewer.html";
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg">Redirecting to style previewer...</p>
    </div>
  );
}
