import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { loadAssets } from "@/lib/assets";
import { Engine } from "@/lib/Engine";

export const Canvas = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const engineRef = useRef<Engine | null>(null);
  useEffect(() => {
    const initCanvas = async () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
      }

      const app = new Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1099bb,
        resizeTo: window,
      });

      appRef.current = app;

      await loadAssets();

      if (app.view && canvasRef.current) {
        canvasRef.current.appendChild(app.view as HTMLCanvasElement);
      }
      engineRef.current = new Engine(app);
    };

    initCanvas();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        engineRef.current?.destroy();
      }
    };
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
