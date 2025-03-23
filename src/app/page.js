import { redirect } from "next/navigation";

export default function Home() {
  redirect("/frame-ui"); // Optional: redirect to frame UI
  // Or keep your original:
  // import Card from "@/components/Card";
  // import CanvasBackground from "../components/CanvasBackground";
  // return (
  //   <div className="relative w-full h-screen flex items-center justify-center">
  //     <CanvasBackground />
  //     <div className="relative z-10">
  //       <Card />
  //     </div>
  //   </div>
  // );
}
