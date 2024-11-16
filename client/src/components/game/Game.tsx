"use client";

import { Loader2 } from "lucide-react";
import { useSocket } from "../hooks/useSocket";

export default function Game() {
  const { connected } = useSocket();

  if (!connected) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  return <div>Game</div>;

  //   return (
  //     <Hud></Hud>
  //     <Canvas></Canvas>
  //   )
}
