import { useSocketContext } from "./SocketContext"
import { useAppDispatch, useAppSelector } from "../store/hooks"
import { selectUser } from "../store/auth"
import { SelectionType } from "../game/selection"
import GroupInfo from "./GroupInfo"
import TileInfo from "./TileInfo"

const Hud = () => {
  const { disconnect } = useSocketContext()

  const selection = useAppSelector((state) => state.selection.id)
  const selectionType = useAppSelector((state) => state.selection.type)
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
      <button
        onClick={() => {
          dispatch({ type: "LOGOUT" })
          disconnect()
        }}
      >
        Logout
      </button>
      {selectionType == SelectionType.Group && (
        <GroupInfo selection={selection} />
      )}
      {selectionType == SelectionType.Tile && (
        <TileInfo selection={selection} />
      )}
    </div>
  )
}

export default Hud
