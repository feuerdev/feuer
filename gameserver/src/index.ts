import { Server } from "socket.io";
import { isAuthenticated } from "./util/firebase";

const io = new Server(3001, {
  cors: {
    origin: "*" //TODO: set sensible value
  }
});

io.on("connection", async (socket) => {
  const token = socket.handshake.auth.token as string | undefined
  if (!token) {
    console.error("no token received")
  }
  const [authenticated, decodedToken] = await isAuthenticated(token as string)
  if(!authenticated) {
    console.error("invalid id token provided")
  }

  console.log("Someone connected", decodedToken?.uid)
  socket.send("hello from server")
  socket.onAny((event, ...args) => {
    console.log("Received message:", event)
  })
});
console.log("Server running")
