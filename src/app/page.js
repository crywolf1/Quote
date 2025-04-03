"use client";

import { Suspense } from "react";
import Card from "@/components/Card";
import CanvasBackground from "../components/CanvasBackground";
import "../styles/globals.css";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const searchParams = useSearchParams();
  const fid = searchParams.get("fid") || "Guest";

  return (
    <div className="relative w-full h-screen flex items-center justify-center">
      <CanvasBackground />
      <div className="relative z-10">
        <Suspense fallback={<div>Loading...</div>}>
          <Card fid={fid} />
        </Suspense>
      </div>
    </div>
  );
}
