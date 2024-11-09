import { useEffect } from "react"
import { Group, Tile } from "../../../shared/objects"
import { TransferDirection } from "../../../shared/objectutil"
import EventBus from "../game/eventbus"

/**
 * React Component to display resource information and display controls to transfer resources between tile and groups
 */
const ResourceInfo = ({ group, tile }: { group: Group; tile: Tile }) => {
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

  useEffect(() => {
    const interval = setInterval(() => {
      EventBus.shared().emitSocket("request tiles", [group.pos])
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-5 gap-1 border p-2">
      <h2 className="col-span-2 text-xl">Group</h2>
      <h2 className="col-span-1 text-xl text-center">Resources</h2>
      <h2 className="col-span-2 text-xl text-right">Tile</h2>
      {Object.keys(group.resources)
        .filter((resourceKey) => {
          return (
            group.resources[resourceKey] > 0 || tile.resources[resourceKey] > 0
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
  )
}

export default ResourceInfo
