import { Suspense } from "react";
import Card from "@/components/Card";
import CanvasBackground from "../components/CanvasBackground";
import "../styles/globals.css";

export default function Home() {
  return (
    <div className="relative w-full h-screen flex items-center justify-center">
      <CanvasBackground />
      <div className="relative z-10">
        <Suspense fallback={<div>Loading...</div>}>
          <Card />
        </Suspense>
      </div>
    </div>
  );
}
