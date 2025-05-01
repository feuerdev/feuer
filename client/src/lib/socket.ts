import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:5001", {
  autoConnect: false,
  withCredentials: true,
  auth: {
    user: new URLSearchParams(window.location.search).get("user") || "test",
  },
});

export default socket;
