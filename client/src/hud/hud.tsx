import * as React from "react"
import EventBus from "../eventbus"

import { getTileById, getTileByPos } from "../../../shared/objectutil"
import GroupInformation from "./group-info"

export default function Hud() {
  const [selectionType, setSelectionType] = React.useState(null)
  const [selectionData, setselectionData] = React.useState(null)

  React.useEffect(() => {
    // Subscribe to relevant events
    EventBus.shared().on("selection", ({ detail }) => {
      switch (detail.type) {
        case 0:
          setselectionData(null)
          break
        case 1:
          setselectionData(window.game.world.groups[detail.selectedId])
          break
        case 2:
          setselectionData(getTileById(detail.selectedId, window.game.world.tiles))
          break
        case 3:
          setselectionData(window.game.world.buildings[detail.selectedId])
          break
      }
      setSelectionType(detail.type)
    })

    EventBus.shared().on("deselection", () => {
      setSelectionType(null)
      setselectionData(null)
    })
  }, [])

  return (
    <div>
      <div id="top-bar" className="w-full bg-slate-900 fixed top-0 flex"></div>
      <div id="bottom-bar" className="w-full h-1/5 bg-slate-900 fixed bottom-0">
        {selectionType == 0 && <div>Nix</div>}
        {selectionType == 1 && <GroupInformation group={selectionData} tile={getTileByPos(selectionData.pos, window.game.world.tiles)} />}
        {selectionType == 2 && <div>Tile</div>}
        {selectionType == 3 && <div>Building</div>}
        {/* <code>{JSON.stringify(selectionData)}</code> */}
      </div>
    </div>
  )
}
