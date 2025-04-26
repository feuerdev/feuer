import { useEffect, useRef } from "react";
import { RenderEngine } from "@/lib/RenderEngine";

export function Canvas({
  registerRenderer,
}: {
  registerRenderer: (engine: RenderEngine) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RenderEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a new canvas element programmatically
    const canvas = document.createElement("canvas");
    canvas.className = "h-screen w-screen";
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Append the canvas to our container
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(canvas);

    // Create and initialize the renderer engine
    const engine = new RenderEngine();
    engineRef.current = engine;

    // Mount canvas to the engine
    engine.mount(canvas);

    // Register the engine with the parent component
    registerRenderer(engine);

    // Clean up
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [registerRenderer]);

  return <div ref={containerRef} className="h-screen w-screen" />;
}
