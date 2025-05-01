import Hud from "@/components/Hud";
import Loading from "./ui/loading";
import { useEffect  } from "react";
import { useEngineStore, useSocketStore } from "@/lib/state";
export default function Game() {
  const engine = useEngineStore.getState().engine;
  const socket = useSocketStore.getState().socket;

  useEffect(() => {
    engine.mount();
  }, [engine]);

  if (!socket.connected) {
    return <Loading text="Connecting to server..." />;
  }

  return <Hud />;
}
