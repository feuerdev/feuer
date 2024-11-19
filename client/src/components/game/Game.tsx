"use client";

import { useSocket } from "../hooks/useSocket";
import Hud from "./Hud";
import Loading from "../ui/loading";
import { Provider } from "jotai";
import { store } from "@/lib/game";

export default function Game() {
  const { connected } = useSocket();

  // TODO: load textures during loading screen

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  return (
    <Provider store={store}>
      <Hud />
      <canvas
        className="h-screen w-screen"
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      />
    </Provider>
  );
}
