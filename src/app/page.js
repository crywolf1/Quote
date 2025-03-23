import Card from "@/components/Card";
import CanvasBackground from "../components/CanvasBackground";

export default function Home() {
  return (
    <div className="relative w-full h-screen flex items-center justify-center">
      <CanvasBackground />
      <div className="relative z-10">
        <Card />
      </div>
    </div>
  );
}
