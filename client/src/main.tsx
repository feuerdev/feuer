import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import Login from "./components/Login"
import Game from "./components/Game"
import { Provider, useSelector } from "react-redux"
import { store } from "./store/store"
import { selectLoading, selectUser } from "./store/auth"
import Loading from "./components/Loading"
import { useAppDispatch } from "./store/hooks"
import GameClass from "./game/game"
import { selectTexturesLoaded } from "./store/game"
import { selectConnected } from "./store/socket"

const App = () => {
  const user = useSelector(selectUser)
  const loadingAuth = useSelector(selectLoading)
  const texturesLoaded = useSelector(selectTexturesLoaded)
  const socketConnected = useSelector(selectConnected)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch({ type: "CHECK_AUTHENTICATION" })
    dispatch({ type: "LOAD_TEXTURES" })
  }, [])

  if (loadingAuth  || !texturesLoaded || (user && !socketConnected)) {
    return <Loading />
  }

  if (!user) {
    return <Login />
  }

  return <Game />
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
)

declare global {
  interface Window {
    game: GameClass
  }
}
