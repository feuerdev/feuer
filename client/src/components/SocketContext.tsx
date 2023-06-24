import { createContext, useContext, useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"
import { useAuthContext } from "./AuthContext"

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
  const { idToken, logout } = useAuthContext()

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
      reconnectionAttempts: 5,
    })
    socket.on("connect", () => {
      console.log("socket connection established")
      setConnecting(false)
      setSocket(socket)
    })
    socket.on("disconnect", () => {
      console.log("socket connection disconnected")
      setSocket(undefined)
      setConnecting(false)
    })
    socket.io.on("reconnect_failed", () => {
      console.log("socket reconnection failed, stopping")
      setSocket(undefined)
      setConnecting(false)
    })

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
            logout()
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
      value={{ socket, connecting: connecting, send: send, disconnect }}
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
