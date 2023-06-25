import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import { AuthProvider, useAuthContext } from "./components/AuthContext"
import Login from "./components/Login"
import { SocketProvider } from "./components/SocketContext"
import Game from "./components/Game"

const Main = () => {
  const { user } = useAuthContext()

  if (!user) {
    return <Login />
  }

  return (
    <SocketProvider>
      <Game />
    </SocketProvider>
  )
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
      <AuthProvider>
        <Main />
      </AuthProvider>
  </React.StrictMode>
)

