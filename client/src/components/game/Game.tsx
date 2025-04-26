"use client";

import { useSocket } from "../hooks/useSocket";
import Hud from "./Hud";
import Loading from "../ui/loading";
import { Canvas } from "./Canvas";
import {
  GameStateProvider,
  useGameStateContext,
} from "@/lib/GameStateProvider";

export default function Game() {
  const { connected } = useSocket();

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  return (
    <GameStateProvider>
      <GameScreen />
    </GameStateProvider>
  );
}

// Separate component to access the context
function GameScreen() {
  const { registerRenderer } = useGameStateContext();

  return (
    <>
      <Hud />
      <Canvas registerRenderer={registerRenderer} />
    </>
  );
}
