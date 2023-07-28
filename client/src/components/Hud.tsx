import { useAppDispatch, useAppSelector } from "../store/hooks"
import { selectUser } from "../store/auth"
import { SelectionType } from "../game/selection"
import GroupInfo from "./GroupInfo"
import TileInfo from "./TileInfo"
import { getTileById } from "../../../shared/objectutil"

const Hud = () => {
  const selection = useAppSelector((state) => state.selection.id)
  const selectionType = useAppSelector((state) => state.selection.type)
  const user = useAppSelector(selectUser)

  // This is to force a re-render from outside events
  useAppSelector((state) => state.selection.refresher)

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
        }}
      >
        Logout
      </button>
      <div
        id="bottom-bar"
        className="w-full h-1/5 bg-slate-900 fixed bottom-0 overflow-y-scroll "
      >
        {selectionType == SelectionType.Group && (
          <GroupInfo group={window.game.world.groups[selection]} />
        )}
        {selectionType == SelectionType.Tile && (
          <TileInfo tile={getTileById(selection, window.game.world.tiles)} />
        )}
      </div>
    </div>
  )
}

export default Hud
