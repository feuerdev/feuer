import { useAuthContext } from "./AuthContext"
import { useSocketContext } from "./SocketContext"
import { useAppSelector } from "../store/hooks"

const Hud = () => {
  const { user, logout } = useAuthContext()
  const { disconnect } = useSocketContext()

  const selection = useAppSelector(state => state.selection.id)

  return (
    <div
      className="[&>*]:pointer-events-auto pointer-events-none absolute inset-0 h-screen w-screen text-white"
      id="hud"
    >
      <div>Hello {user?.displayName}! You're in game! This is the dev branch btw</div>
      <div>Selection: {selection}</div>
      <button
        onClick={() => {
          logout()
          disconnect()
        }}
      >
        Logout
      </button>
    </div>
  )
}

export default Hud
