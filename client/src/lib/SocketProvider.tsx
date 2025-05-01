import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { io, Socket } from "socket.io-client";

// Create socket instance
const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:5001", {
  autoConnect: false,
  withCredentials: true,
  auth: {
    user: new URLSearchParams(window.location.search).get("user") || "test",
  },
});

// Create a context for the socket
const SocketContext = createContext<{
  socket: Socket;
  connected: boolean;
} | null>(null);

// Provider component
export function SocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    // Set up socket event listeners
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Connect to the socket
    socket.connect();

    // Clean up on unmount
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook to use the socket context
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
