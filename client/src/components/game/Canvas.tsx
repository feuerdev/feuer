import { useEffect, useRef } from "react";
import { RenderEngine } from "@/lib/RenderEngine";
import { useGameStateContext } from "@/lib/GameStateProvider";

export function Canvas() {
  const engineRef = useRef<RenderEngine | null>(null);
  const { registerRenderer } = useGameStateContext();


  useEffect(() => {
    if (engineRef.current) return;

    const engine = new RenderEngine();
    engineRef.current = engine;

    registerRenderer(engine);

    // Clean up
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [registerRenderer]);

  return null;
}
