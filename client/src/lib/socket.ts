import { io } from "socket.io-client";

if (!process.env.NEXT_PUBLIC_SERVER_URL) {
  throw new Error("NEXT_PUBLIC_SERVER_URL is not set");
}

const socket = io(process.env.NEXT_PUBLIC_SERVER_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket"],
});

export default socket;
