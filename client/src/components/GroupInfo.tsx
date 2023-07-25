import { Group } from "../../../shared/objects"
import { TransferDirection, getTileByPos } from "../../../shared/objectutil"
import EventBus from "../game/eventbus"

const GroupInfo = ({ selection }: { selection: number }) => {

  const requestRemoveUnit = (groupId: number, unitId: number) => {
    EventBus.shared().emitSocket("request unit remove", {
      groupId: groupId,
      unitId: unitId,
    })
  }

  const requestResourceTransfer = (group: Group, resource: string, direction: TransferDirection) => {
    EventBus.shared().emitSocket("request transfer", {
      groupId: group.id,
      resource: resource,
      amount: direction == TransferDirection.group ? -5 : 5,
    })
    EventBus.shared().emitSocket("request tiles", [group.pos])
  }

  const group = window.game.world.groups[selection]
  const tile = getTileByPos(group.pos, window.game.world.tiles)

  if (!group) {
    return <div>No group selected</div>
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
            <div>{JSON.stringify(group.pos)}</div>
            <div>Status</div>
            <div>{group.targetHexes?.length > 0 ? `Moving (${group.movementStatus.toFixed()} %)` : "Waiting"}</div>
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
                <button onClick={() => requestRemoveUnit(group.id, unit.id)}>Remove</button>,
              ]
            })}
          </div>
          {/* Resources Info */}
          <div className="grid grid-cols-5 gap-1 border p-2">
            <h2 className="col-span-2 text-xl">Resources</h2>
            <h2 className="col-span-3 text-xl text-right">Tile</h2>
            {Object.keys(group.resources)
              .filter((resourceKey) => {
                return group.resources[resourceKey] > 0 || tile.resources[resourceKey] > 0
              })
              .map((resourceKey) => {
                return [
                  <div className="capitalized">{resourceKey}</div>,
                  <div>{group.resources[resourceKey]}</div>,
                  <button onClick={() => requestResourceTransfer(group, resourceKey, TransferDirection.group)}>&lt;</button>,
                  <button onClick={() => requestResourceTransfer(group, resourceKey, TransferDirection.tile)}>&gt;</button>,
                  <div>{tile.resources[resourceKey]}</div>,
                ]
              })}
          </div>
        </div>
      </div>
    

  //   <div>
  //     <div>Selection: {selection}</div>
  //     <div>Owner: {group.owner}</div>
  //     <div>Spotting: {group.spotting}</div>
  //     <div>Target Hexes: {group.targetHexes.length}</div>
  //     <div>
  //       Position: {group.pos.q}, {group.pos.r}
  //     </div>
  //     <div>Movement Status: {group.movementStatus}</div>
  //     <div>Units: {group.units.length}</div>
  //     <div>Resources: {JSON.stringify(group.resources)}</div>
  //   </div>
  // )
  )
}

export default GroupInfo
