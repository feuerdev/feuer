import { Group } from "../../../shared/objects"
import { getTileByPos } from "../../../shared/objectutil"
import EventBus from "../game/eventbus"
import ResourceInfo from "./ResourceInfo"

const GroupInfo = ({ group }: { group: Group }) => {
  const requestRemoveUnit = (groupId: number, unitId: number) => {
    EventBus.shared().emitSocket("request unit remove", {
      groupId: groupId,
      unitId: unitId,
    })
  }

  if (!group) {
    return <div>No group selected</div>
  }

  const tile = getTileByPos(group.pos, window.game.world.tiles)

  if (!tile) {
    return <div>Group is not on a tile?</div>
  }

  return (
    <div>
      <div className="flex items-start place-content-start gap-1 flex-row p-2">
        <div className="grid auto-cols-min gap-1 border p-2">
          {/* General Info */}
          <h2 className="col-span-2 text-xl">Group</h2>
          <div>Owner</div>
          <div>{group.owner == window.game.uid ? "You" : "Other Player"}</div>
          <div>Position</div>
          <div>
            {group.pos.q}:{group.pos.r}
          </div>
          <div>Status</div>
          <div>
            {group.targetHexes?.length > 0
              ? `Moving (${group.movementStatus.toFixed()} %)`
              : "Waiting"}
          </div>
          <div>Spotting</div>
          <div>{group.spotting}</div>
          <div>Units</div>
          <div>{group.units.length}</div>
        </div>
        {/* Units Info */}
        <div className="grid auto-cols-min gap-1 border p-2">
          <h2 className="col-span-2 text-xl">Units</h2>
          {group.units.map((unit) => {
            return [
              <div>Owner</div>,
              <div>{unit.owner}</div>,
              <div>Leadership</div>,
              <div>{unit.leadership}</div>,
              <button onClick={() => requestRemoveUnit(group.id, unit.id)}>
                Remove
              </button>,
            ]
          })}
        </div>
        {/* Resources Info */}
        <ResourceInfo group={group} tile={tile} />
      </div>
    </div>
  )
}

export default GroupInfo
