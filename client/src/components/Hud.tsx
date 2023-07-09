import { useSocketContext } from "./SocketContext"
import { useAppDispatch, useAppSelector } from "../store/hooks"
import { selectUser } from "../store/auth"

const Hud = () => {
  const { disconnect } = useSocketContext()

  const selection = useAppSelector((state) => state.selection.id)
  const user = useAppSelector(selectUser)

  const dispatch = useAppDispatch()

  return (
    <div
      className="[&>*]:pointer-events-auto pointer-events-none absolute inset-0 h-screen w-screen text-white"
      id="hud"
    >
      <div>
        Hello {user?.displayName}! You're in game! This is the dev branch btw
      </div>
      <div>Selection: {selection}</div>
      <button
        onClick={() => {
          dispatch({ type: "LOGOUT" })
          disconnect()
        }}
      >
        Logout
      </button>
    </div>
  )
}

export default Hud
