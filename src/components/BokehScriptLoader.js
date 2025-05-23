"use client"; // Mark this file as client-side component

import { useEffect } from "react";
import Script from "next/script";

const BokehScriptLoader = () => {
  useEffect(() => {
    const checkBokeh = setInterval(() => {
      if (window.Bokeh1Background) {
        clearInterval(checkBokeh);
        console.log("✅ Bokeh1Background loaded successfully!");
      }
    }, 100);

    return () => clearInterval(checkBokeh);
  }, []);

  return (
    <>
      <Script
        src="/libs/bokeh1.cdn.min.js"
        strategy="beforeInteractive"
        onLoad={() => console.log("✅ Script loaded")}
        onError={() => console.error("❌ Failed to load script")}
      />
    </>
  );
};

export default BokehScriptLoader;
