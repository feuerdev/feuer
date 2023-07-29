import { Group } from "../../../shared/objects"
import { TransferDirection, getTileByPos } from "../../../shared/objectutil"
import EventBus from "../game/eventbus"

const GroupInfo = ({ group }: { group: Group }) => {
  const requestRemoveUnit = (groupId: number, unitId: number) => {
    EventBus.shared().emitSocket("request unit remove", {
      groupId: groupId,
      unitId: unitId,
    })
  }

  const requestResourceTransfer = (
    group: Group,
    resource: string,
    direction: TransferDirection,
    amount: number = 5
  ) => {
    EventBus.shared().emitSocket("request transfer", {
      groupId: group.id,
      resource: resource,
      amount: direction == TransferDirection.group ? -amount : amount,
    })
    EventBus.shared().emitSocket("request tiles", [group.pos])
    EventBus.shared().emitSocket("request group", group.id)
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
        <div className="grid grid-cols-5 gap-1 border p-2">
          <h2 className="col-span-2 text-xl">Resources</h2>
          <h2 className="col-span-3 text-xl text-right">Tile</h2>
          {Object.keys(group.resources)
            .filter((resourceKey) => {
              return (
                group.resources[resourceKey] > 0 ||
                tile.resources[resourceKey] > 0
              )
            })
            .map((resourceKey) => {
              return [
                <div className="capitalized">{resourceKey}</div>,
                <div>{group.resources[resourceKey] || 0}</div>,
                <button
                  onClick={() =>
                    requestResourceTransfer(
                      group,
                      resourceKey,
                      TransferDirection.group
                    )
                  }
                >
                  &lt;
                </button>,
                <button
                  onClick={() =>
                    requestResourceTransfer(
                      group,
                      resourceKey,
                      TransferDirection.tile
                    )
                  }
                >
                  &gt;
                </button>,
                <div>{tile.resources[resourceKey] || 0}</div>,
              ]
            })}
        </div>
      </div>
    </div>
  )
}

export default GroupInfo
