"use client";

import { Loader2 } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import Hud from "./Hud";

export default function Game() {
  const { connected } = useSocket();

  // TODO: load textures during loading screen

  if (!connected) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Hud />
      <canvas
        className="h-screen w-screen"
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      />
    </>
  );
}
