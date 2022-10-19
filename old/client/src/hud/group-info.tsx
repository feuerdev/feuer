import * as React from "react"
import { Group, Tile } from "../../../shared/objects"
import { TransferDirection } from "../../../shared/objectutil"
import EventBus from "../eventbus"

export default function GroupInformation(props: { group: Group; tile: Tile }) {
  const requestRemoveUnit = (groupId: number, unitId: number) => {
    EventBus.shared().emitSocket("request unit remove", {
      groupId: groupId,
      unitId: unitId,
    })
  }

  const getTileResource = (resourceKey: string) => {
    return props.tile.resources[resourceKey] || 0
  }

  const requestResourceTransfer = (group: Group, resource: string, direction: TransferDirection) => {
    EventBus.shared().emitSocket("request transfer", {
      groupId: group.id,
      resource: resource,
      amount: direction == TransferDirection.group ? -5 : 5,
    })
    EventBus.shared().emitSocket("request tiles", [group.pos])
  }

  if (!props.group) {
    return <div />
  }

  return (
    <div>
      <div className="flex items-start place-content-start gap-1 flex-row p-2">
        <div className="grid auto-cols-min gap-1 border p-2">
          {/* General Info */}
          <h2 className="col-span-2 text-xl">Group</h2>
          <div>Owner</div>
          <div>{props.group.owner}</div>
          <div>Position</div>
          <div>{JSON.stringify(props.group.pos)}</div>
          <div>Status</div>
          <div>{props.group.targetHexes?.length > 0 ? `Moving (${props.group.movementStatus.toFixed()} %)` : "Waiting"}</div>
          <div>Spotting</div>
          <div>{props.group.spotting}</div>
          <div>Units</div>
          <div>{props.group.units.length}</div>
        </div>
        {/* Units Info */}
        <div className="grid auto-cols-min gap-1 border p-2">
          <h2 className="col-span-2 text-xl">Units</h2>
          {props.group.units.map((unit) => {
            return [
              <div>Owner</div>,
              <div>{unit.owner}</div>,
              <div>Leadership</div>,
              <div>{unit.leadership}</div>,
              <button onClick={() => requestRemoveUnit(props.group.id, unit.id)}>Remove</button>,
            ]
          })}
        </div>
        {/* Resources Info */}
        <div className="grid grid-cols-5 gap-1 border p-2">
          <h2 className="col-span-2 text-xl">Resources</h2>
          <h2 className="col-span-3 text-xl text-right">Tile</h2>
          {Object.keys(props.group.resources)
            .filter((resourceKey) => {
              return props.group.resources[resourceKey] > 0 || props.tile.resources[resourceKey] > 0
            })
            .map((resourceKey) => {
              return [
                <div className="capitalized">{resourceKey}</div>,
                <div>{props.group.resources[resourceKey]}</div>,
                <button onClick={() => requestResourceTransfer(props.group, resourceKey, TransferDirection.group)}>&lt;</button>,
                <button onClick={() => requestResourceTransfer(props.group, resourceKey, TransferDirection.tile)}>&gt;</button>,
                <div>{getTileResource(resourceKey)}</div>,
              ]
            })}
        </div>
      </div>
    </div>
  )

  // <div>Group: {JSON.stringify(props.group)}</div>
}
