"use client";

import { useSocket } from "../hooks/useSocket";
import Hud from "./Hud";
import Loading from "../ui/loading";
import { Provider } from "jotai";
import { removeAllListeners, setListeners, store } from "@/lib/game";
import { useEffect, useState } from "react";
import { loadTextures } from "@/lib/renderer";
import { Canvas } from "./Canvas";

export default function Game() {
  const { connected } = useSocket();
  const [texturesLoaded, setTexturesLoaded] = useState(false);

  useEffect(() => {
    setListeners();
    const loadTexturesAsync = async () => {
      await loadTextures();
      setTexturesLoaded(true);
    };

    loadTexturesAsync();

    return () => {
      removeAllListeners();
    };
  }, []);

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  if (!texturesLoaded) {
    return <Loading text="Loading textures..." />;
  }

  return (
    <Provider store={store}>
      <Hud />
      <Canvas />
    </Provider>
  );
}
