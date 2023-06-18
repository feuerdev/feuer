import { AuthProvider, useAuthContext } from "./components/AuthContext"
import Game from "./components/Game"
import Login from "./components/Login"
import { SocketProvider } from "./components/SocketContext"

function App() {
  return (
    <>
      <AuthProvider>
        <Main />
      </AuthProvider>
    </>
  )
}

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

export default App
