import Card from "@/components/Card";
import CanvasBackground from "../components/CanvasBackground";

export const metadata = {
  title: "Quote App",
  description: "Create, edit, and share your favorite quotes!",
  openGraph: {
    title: "Quote App",
    description: "Create, edit, and share your favorite quotes!",
    images: ["https://your-site.com/frame-image.png"], // Replace with a real URL
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://your-site.com/frame-image.png", // Static or dynamic image
    "fc:frame:post_url": "quote-production-679a.up.railway.app",
    "fc:frame:button:1": "Get a Quote",
    "fc:frame:button:2": "Submit Your Quote",
  },
};

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
