import { startRenderer, stopRenderer } from "@/lib/renderer";
import { useEffect, useRef } from "react";

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a new canvas element programmatically
    const canvas = document.createElement("canvas");
    canvas.className = "h-screen w-screen";
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Append the canvas to our container
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(canvas);

    startRenderer(canvas);

    // Create proper cleanup function
    const cleanup = () => {
      stopRenderer();
      // We don't need to remove the canvas manually as PIXI.destroy() likely does this
    };

    return cleanup;
  }, []);

  return <div ref={containerRef} className="h-screen w-screen" />;
}
