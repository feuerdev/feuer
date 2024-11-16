import { useEffect } from "react";
import socket from "@/lib/socket";

export function useSocket() {
  useEffect(() => {
    socket.connect();

    // TODO: authenticate socket

    return () => {
      socket.disconnect();
    };
  }, []);

  return socket;
}
