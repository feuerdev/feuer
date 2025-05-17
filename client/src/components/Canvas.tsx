import { useEffect, useRef } from "react";
import { Engine } from "@/lib/engine";
import * as Pixi from "pixi.js";
export const Canvas = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initCanvas = async () => {
      const app = new Pixi.Application();

      await app.init({
        antialias: true,
        resizeTo: window,
      });

      if (app.canvas && canvasRef.current) {
        canvasRef.current.appendChild(app.canvas);
      }

      const engine = new Engine(app);
      if (import.meta.hot) {
        import.meta.hot.dispose(() => {
          try {
            canvasRef.current?.removeChild(app?.canvas);
            engine.destroy();
            app.destroy(true);
          } catch (error) {
            console.error("Error disposing of Pixi app:", error);
          }
        });
      }
    };

    initCanvas();
  }, []);

  return (
    <div
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        overflow: "hidden",
      }}
    ></div>
  );
};
