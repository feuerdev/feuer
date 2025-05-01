import { useSocket } from "@/lib/SocketProvider";
import Hud from "@/components/hud/Hud";
import Loading from "../ui/loading";
import { Canvas } from "./Canvas";
import { GameStateProvider } from "@/lib/GameStateProvider";
import { SocketProvider } from "@/lib/SocketProvider";

export default function Game() {
  return (
    <SocketProvider>
      <ConnectionWrapper />
    </SocketProvider>
  );
}

// Component to check connection status
function ConnectionWrapper() {
  const { connected } = useSocket();

  if (!connected) {
    return <Loading text="Connecting to server..." />;
  }

  return (
    <GameStateProvider>
      <GameScreen />
    </GameStateProvider>
  );
}

// Separate component to access the context
function GameScreen() {
  return (
    <>
      <Hud />
      <Canvas />
    </>
  );
}
