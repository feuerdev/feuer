import { startRenderer, stopRenderer } from "@/lib/renderer";
import { handleViewportClick } from "@/lib/game";
import { useEffect, useRef, useState } from "react";

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a new canvas element programmatically
    const canvas = document.createElement("canvas");
    canvas.className = "h-screen w-screen";
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Append the canvas to our container
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(canvas);

    // Pass the click handler directly to startRenderer
    const success = startRenderer(canvas, handleViewportClick);
    if (!success) {
      setRenderError(
        "Failed to initialize the renderer. Your browser may not support WebGL."
      );
    }

    // Create proper cleanup function
    const cleanup = () => {
      stopRenderer();
      // We don't need to remove the canvas manually as PIXI.destroy() likely does this
    };

    return cleanup;
  }, []);

  return (
    <>
      {renderError && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white p-2 text-center">
          {renderError}
        </div>
      )}
      <div ref={containerRef} className="h-screen w-screen" />
    </>
  );
}
