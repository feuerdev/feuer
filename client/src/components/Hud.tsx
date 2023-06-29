import { useAuthContext } from "./AuthContext"
import { useSocketContext } from "./SocketContext"

const Hud = () => {
  const { user, logout } = useAuthContext()
  const { disconnect } = useSocketContext()

  return (
    <div
      className="[&>*]:pointer-events-auto pointer-events-none absolute inset-0 h-screen w-screen text-white"
      id="hud"
    >
      <div>Hello {user?.displayName}! You're in game! This is the dev branch btw</div>
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
