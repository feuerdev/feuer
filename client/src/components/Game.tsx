import Hud from "@/components/Hud";
import Loading from "./ui/loading";
import { useEffect  } from "react";
import { useEngineStore, useSocketStore } from "@/lib/state";
export default function Game() {
  const engine = useEngineStore((state) => state.engine);
  const connected = useSocketStore((state) => state.connected);

  useEffect(() => {
    engine.mount();
  }, [engine]);

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  return <Hud />;
}
