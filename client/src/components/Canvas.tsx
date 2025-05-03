import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { useStore } from "@/lib/state";
import { loadAssets } from "@/lib/assets";

export const Canvas = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const setApp = useStore((state) => state.setApp);

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

      setApp(app);

      if (app.view && canvasRef.current) {
        canvasRef.current.appendChild(app.view as HTMLCanvasElement);
      }
    };

    initCanvas();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        setApp(null);
      }
    };
  }, [setApp]);

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
