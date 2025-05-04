import { useEffect, useRef } from "react";
import { loadAssets } from "@/lib/assets";
import { Engine } from "@/lib/Engine";
import * as Pixi from "pixi.js";
export const Canvas = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initCanvas = async () => {
      const app = new Pixi.Application();

      await app.init({
        backgroundColor: "#FFF5D4",
        antialias: true,
        resizeTo: window,
      });

      await loadAssets();

      if (app.canvas && canvasRef.current) {
        console.log("append");
        canvasRef.current.appendChild(app.canvas);
      }

      const engine = new Engine(app);
      if (import.meta.hot) {
        import.meta.hot.dispose(() => {
          console.log("dispose");
          canvasRef.current?.removeChild(app.canvas);
          engine.destroy();
          app.destroy(true);
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
