import Hud from "@/components/Hud";
import Loading from "./ui/loading";
import { useStore } from "@/lib/state";
import { Canvas } from "@/components/Canvas";

export default function Game() {
  const connected = useStore((state) => state.connected);

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  return (
    <>
      <Canvas />
      <Hud />
    </>
  );
}
