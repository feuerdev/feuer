import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import Login from "./components/Login"
import { SocketProvider } from "./components/SocketContext"
import Game from "./components/Game"
import { Provider, useSelector } from "react-redux"
import { store } from "./store/store"
import { selectLoading, selectUser } from "./store/auth"
import Loading from "./components/Loading"
import { useAppDispatch } from "./store/hooks"

const App = () => {
  const user = useSelector(selectUser)
  const loading = useSelector(selectLoading)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch({ type: "CHECK_AUTHENTICATION" })
  }, [])

  if (loading) {
    return <Loading />
  }

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
      <App />
    </Provider>
  </React.StrictMode>
)
