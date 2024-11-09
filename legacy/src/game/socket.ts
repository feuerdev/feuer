import { io, Socket } from "socket.io-client"
import EventBus from "../game/eventbus"
import { store } from "../store/store"

export let socket: Socket | undefined

export const connect = (idToken: string) => {
  disconnect()

  socket = io(import.meta.env.VITE_SERVER_URL, {
    auth: { token: idToken },
    autoConnect: false,
  })

  // Propagate any events
  socket.onAny((eventName: string, data: any) => {
    EventBus.shared().emit(eventName, data)
    // console.log("mesage received", eventName, data)
  })
  socket.on("connect", () => {
    console.log("socket connection established")
    store.dispatch({ type: "SOCKET_CONNECTION_ESTABLISHED" })
  })
  socket.on("disconnect", (reason) => {
    console.log("DEBUG: socket got disconnected:", reason)
    store.dispatch({ type: "SOCKET_CONNECTION_DISCONNECTED" })
  })

  socket.connect()
}

export const disconnect = () => {
  socket?.offAny()
  socket?.disconnect()
}
