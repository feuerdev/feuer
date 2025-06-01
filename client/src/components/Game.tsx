import Hud from "@/components/Hud";
import Loading from "./ui/loading";
import { useStore } from "@/lib/state";
import { Canvas } from "@/components/Canvas";
import { useEffect } from "react";
import { initializeSocket } from "@/lib/socket";
import DebugMenu from "@/components/DebugMenu";

export default function Game() {
  const connected = useStore((state) => state.connected);

  useEffect(() => {
    initializeSocket();
  }, []);

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  return (
    <>
      <Canvas />
      <Hud />
      <DebugMenu />
    </>
  );
}
