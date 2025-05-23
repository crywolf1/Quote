(function () {
  // Check if Bokeh1Background is available globally and if not, wait for it
  if (typeof window.Bokeh1Background === "undefined") {
    console.error("Bokeh1Background is not available.");
  } else {
    console.log("Bokeh1Background loaded successfully.");
    // If Bokeh1Background is available, assign it to the window object
    window.Bokeh1Background = window.Bokeh1Background || {};
  }
})();
