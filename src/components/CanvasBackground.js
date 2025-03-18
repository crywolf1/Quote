"use client"; // Ensure this is a client-side component

import { useEffect } from "react";
import Script from "next/script";

const CanvasBackground = () => {
  useEffect(() => {
    let bokeh1Background;

    const initializeBokeh = () => {
      console.log("⏳ Trying to initialize Bokeh1Background...");

      const canvas = document.getElementById("webgl-canvas");
      if (!canvas) {
        console.error("❌ Canvas not found!");
        return;
      }
      if (!window.Bokeh1Background) {
        console.error("❌ Bokeh1Background is not available!");
        return;
      }

      // Initialize Bokeh effect
      bokeh1Background = new window.Bokeh1Background(canvas);
      bokeh1Background.loadMap("/assets/bokeh-particles2.png"); // Use local asset
      bokeh1Background.setColors([0x6d4862, 0xfd826c, 0x22ccc1]);

      console.log("✅ Bokeh1Background initialized successfully!");

      // Click event to change colors
      document.body.addEventListener("click", () => {
        if (bokeh1Background) {
          bokeh1Background.setColors([
            Math.random() * 0xffffff,
            Math.random() * 0xffffff,
            Math.random() * 0xffffff,
          ]);
          console.log("✅ Colors changed on click");
        }
      });
    };

    // Check for script load
    const checkBokeh = setInterval(() => {
      if (window.Bokeh1Background) {
        clearInterval(checkBokeh);
        initializeBokeh();
      }
    }, 100);

    return () => {
      clearInterval(checkBokeh);
      if (bokeh1Background) {
        bokeh1Background = null;
      }
    };
  }, []);

  return (
    <div id="canvas-container">
      {/* WebGL Canvas */}
      <canvas id="webgl-canvas"></canvas>

      {/* Load Bokeh Script from Local File */}
      <Script
        src="/libs/bokeh1.cdn.min.js" // Now using local file only!
        strategy="beforeInteractive"
        type="module"
        onLoad={() => console.log("✅ Script loaded from local file")}
        onError={() => console.error("❌ Failed to load script")}
      />
    </div>
  );
};

export default CanvasBackground;
