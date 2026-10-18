import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

const root = ReactDOM.createRoot(document.getElementById("root"));
const mount = () =>
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

// Wait (briefly) for the self-hosted fonts so the headline never reflows
// mid-animation. The page background is already painted by index.html, so
// nothing flashes; the timeout guarantees we never block on a slow load.
const fontsReady = Promise.all([
  document.fonts.load('400 1em "Instrument Serif"'),
  document.fonts.load('italic 400 1em "Instrument Serif"'),
  document.fonts.load('500 1em "Geist Variable"'),
  document.fonts.load('400 1em "Geist Mono Variable"'),
]).catch(() => {});

Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(mount);
