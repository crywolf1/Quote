import Head from "next/head";
import Card from "@/components/Card";
import CanvasBackground from "../components/CanvasBackground";

export default function Home() {
  return (
    <>
      <Head>
        <meta property="og:title" content="My Farcaster Frame" />
        <meta property="og:description" content="A cool Farcaster Frame V2" />
        <meta property="og:image" content="/assets/phone.png" />
        <meta property="fc:frame" content="vNext" />
        <meta
          property="fc:frame:post_url"
          content="https://quote-production-679a.up.railway.app/"
        />
      </Head>

      <div className="relative w-full h-screen flex items-center justify-center">
        <CanvasBackground />
        <div className="relative z-10">
          <Card />
        </div>
      </div>
    </>
  );
}
