import { io } from "socket.io-client";

export const initializeSocket = () => {
  return io(import.meta.env.VITE_SERVER_URL || "http://localhost:5001", {
    withCredentials: true,
    auth: {
      user: new URLSearchParams(window.location.search).get("user") || "test",
    },
  });
};
