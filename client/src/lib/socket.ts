import { io } from "socket.io-client";
import { useStore } from "./state";

export const initializeSocket = () => {
  const socket = io(
    import.meta.env.VITE_SERVER_URL || "http://localhost:5001",
    {
      withCredentials: true,
      auth: {
        user: new URLSearchParams(window.location.search).get("user") || "test",
      },
    }
  );

  socket.on("connect", () => {
    useStore.getState().setConnected(true);
  });

  socket.on("disconnect", () => {
    useStore.getState().setConnected(false);
  });

  return socket;
};
