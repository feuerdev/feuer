import { startRenderer, stopRenderer } from "@/lib/renderer";
import { useEffect } from "react";

export function Canvas() {

  useEffect(() => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    startRenderer(canvas);

    return () => {
      stopRenderer();
    };
  }, []);

  return (
    <canvas
      className="h-screen w-screen"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    />
  );
}
