import { createContext, useContext, useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"
import EventBus from "../game/eventbus"
import { useAppDispatch, useAppSelector } from "../store/hooks"
import { selectIdToken } from "../store/auth"

const SocketContext = createContext<
  | {
      socket: Socket | undefined
      connecting: boolean
      send: (message: string, data: any) => void
      disconnect: () => void
    }
  | undefined
>(undefined)

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const idToken = useAppSelector(selectIdToken)

  const dispatch = useAppDispatch()

  const [connecting, setConnecting] = useState(true)
  const [socket, setSocket] = useState<Socket | undefined>(undefined)

  useEffect(() => {
    setConnecting(true)
    if (!idToken) {
      return
    }

    const socket = io(import.meta.env.VITE_SERVER_URL, {
      auth: { token: idToken },
      reconnection: true,
      reconnectionDelay: 2000,
      autoConnect: false,
    })

    // Propagate any events
    socket.onAny((eventName: string, data: any) => {
      EventBus.shared().emit(eventName, data)
      // console.log("mesage received", eventName, data)
    })
    socket.on("connect", () => {
      console.log("socket connection established")
      setConnecting(false)
      setSocket(socket)
    })
    socket.on("disconnect", (reason) => {
      console.log("DEBUG: socket got disconnected:", reason)
      setSocket(undefined)
      setConnecting(false)
    })
    socket.io.on("reconnect_failed", () => {
      console.log("socket reconnection failed, stopping")
      setSocket(undefined)
      setConnecting(false)
    })

    socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [idToken])

  const send = (message: string, data: any) => {
    socket?.send(message, data)
  }

  const disconnect = () => {
    socket?.disconnect()
  }

  if (!connecting && !socket) {
    return (
      <>
        <div>Something bad has happened with the connection :(</div>
        <br />
        <button
          onClick={() => {
            dispatch({
              type: "LOGOUT",
            })
            disconnect()
          }}
        >
          Logout
        </button>
      </>
    )
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        connecting: connecting,
        send: send,
        disconnect: disconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export const useSocketContext = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocketContext must be used within a SocketProvider")
  }
  return context
}
