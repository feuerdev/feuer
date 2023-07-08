import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import { AuthProvider, useAuthContext } from "./components/AuthContext"
import Login from "./components/Login"
import { SocketProvider } from "./components/SocketContext"
import Game from "./components/Game"
import { Provider } from "react-redux"
import { store } from "./store/store"

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
    <Provider store={store}>
      <AuthProvider>
        <Main />
      </AuthProvider>
    </Provider>
  </React.StrictMode>
)

