import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import Game from "./components/game/Game";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Game />
  </StrictMode>
);
