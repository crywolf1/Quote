"use client";

import { Suspense } from "react";
import CardContent from "../../components/CardContent"; // New component
import CanvasBackground from "../../components/CanvasBackground";

export default function FrameUIPage() {
  return (
    <div className="relative w-full h-screen flex items-center justify-center">
      <CanvasBackground />
      <div className="relative z-10">
        <Suspense fallback={<div>Loading...</div>}>
          <CardContent />
        </Suspense>
      </div>
    </div>
  );
}