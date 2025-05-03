import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { usePixiAppStore } from "@/lib/state";

export const Canvas = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const setApp = usePixiAppStore((state) => state.setApp);

  useEffect(() => {
    if (appRef.current) {
      appRef.current.destroy(true, { children: true });
    }

    const app = new Application({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    appRef.current = app;

    setApp(app);

    if (canvasRef.current) {
      canvasRef.current.appendChild(app.view as unknown as Node);
    }

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
      style={{ width: window.innerWidth, height: window.innerHeight }}
    ></div>
  );
};
