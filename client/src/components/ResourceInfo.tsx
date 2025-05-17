import { useEffect } from "react";
import { Group, Tile } from "@shared/objects";
import { TransferDirection } from "@shared/objectutil";
import { useStore } from "@/lib/state";
import { InfoBox } from "./InfoBox";
import { Button } from "./ui/Button";

/**
 * React Component to display resource information and display controls to transfer resources between tile and groups
 */
const ResourceInfo = ({
  group,
  tile,
  className,
}: {
  group: Group;
  tile: Tile;
  className?: string;
}) => {
  const socket = useStore((state) => state.socket);

  const requestResourceTransfer = (
    group: Group,
    resource: string,
    direction: TransferDirection,
    amount: number = 5
  ) => {
    socket?.emit("request transfer", {
      groupId: group.id,
      resource: resource,
      amount: direction === TransferDirection.group ? -amount : amount,
    });
    socket?.emit("request tiles", [group.pos]);
    socket?.emit("request group", group.id);
  };

  useEffect(() => {
    if (!socket) return;

    const interval = setInterval(() => {
      socket.emit("request tiles", [group.pos]);
    }, 500);
    return () => clearInterval(interval);
  }, [group.pos, socket]);

  // Get all unique resource keys from both group and tile
  const resourceKeys = [
    ...new Set([
      ...Object.keys(group.resources),
      ...Object.keys(tile.resources),
    ]),
  ].filter(
    (key) =>
      (group.resources[key as keyof typeof group.resources] || 0) > 0 ||
      (tile.resources[key as keyof typeof tile.resources] || 0) > 0
  );

  if (resourceKeys.length === 0) {
    return (
      <InfoBox title="Resources" className={className}>
        <p className="text-center text-gray-400 italic text-xs">
          No resources available
        </p>
      </InfoBox>
    );
  }

  return (
    <InfoBox title="Resources" className={className}>
      <div className="grid grid-cols-3 gap-1 text-xs">
        <div className="font-semibold text-center text-xs sticky top-0 bg-gray-900 py-0.5">
          Group
        </div>
        <div className="font-semibold text-center text-xs sticky top-0 bg-gray-900 py-0.5">
          Transfer
        </div>
        <div className="font-semibold text-center text-xs sticky top-0 bg-gray-900 py-0.5">
          Tile
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto pr-1 pt-1">
        {resourceKeys.map((resourceKey) => (
          <div key={resourceKey} className="contents">
            <div className="bg-gray-800 p-0.5 rounded text-center h-9">
              <div className="capitalize text-xs text-gray-400 truncate">
                {resourceKey}
              </div>
              <div className="font-medium text-xs">
                {group.resources[resourceKey as keyof typeof group.resources] ||
                  0}
              </div>
            </div>

            <div className="flex justify-center items-center gap-0.5 h-9">
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  requestResourceTransfer(
                    group,
                    resourceKey,
                    TransferDirection.group
                  )
                }
                className="min-w-0 w-6 px-0"
              >
                &larr;
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  requestResourceTransfer(
                    group,
                    resourceKey,
                    TransferDirection.tile
                  )
                }
                className="min-w-0 w-6 px-0"
              >
                &rarr;
              </Button>
            </div>

            <div className="bg-gray-800 p-0.5 rounded text-center h-9">
              <div className="capitalize text-xs text-gray-400 truncate">
                {resourceKey}
              </div>
              <div className="font-medium text-xs">
                {tile.resources[resourceKey as keyof typeof tile.resources] ||
                  0}
              </div>
            </div>
          </div>
        ))}
      </div>
    </InfoBox>
  );
};

export default ResourceInfo;
