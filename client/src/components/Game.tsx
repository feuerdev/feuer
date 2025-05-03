import Hud from "@/components/Hud";
import Loading from "./ui/loading";
import { useEffect } from "react";
import { useEngineStore, useSocketStore, usePixiAppStore } from "@/lib/state";
import { Canvas } from "@/components/Canvas";

export default function Game() {
  const engine = useEngineStore((state) => state.engine);
  const connected = useSocketStore((state) => state.connected);
  const app = usePixiAppStore((state) => state.app);

  useEffect(() => {
    if (app) {
      engine.mount();
    }
  }, [engine, app]);

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  return (
    <>
      <Canvas />
      <Hud />
    </>
  );
}
