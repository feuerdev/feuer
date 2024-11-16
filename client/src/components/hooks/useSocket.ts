import { useEffect, useState } from "react";
import socket from "@/lib/socket";

export function useSocket() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return { connected, socket };
}
