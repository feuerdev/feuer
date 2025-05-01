import { useEffect } from "react";
import { Group, Tile } from "@shared/objects";
import { TransferDirection } from "@shared/objectutil";
import { useSocketStore } from "@/lib/state";
import { InfoBox } from "./InfoBox";
import { Button } from "./ui/Button";

/**
 * React Component to display resource information and display controls to transfer resources between tile and groups
 */
const ResourceInfo = ({ group, tile }: { group: Group; tile: Tile }) => {
  const socket = useSocketStore((state) => state.socket);

  const requestResourceTransfer = (
    group: Group,
    resource: string,
    direction: TransferDirection,
    amount: number = 5
  ) => {
    socket.emit("request transfer", {
      groupId: group.id,
      resource: resource,
      amount: direction === TransferDirection.group ? -amount : amount,
    });
    socket.emit("request tiles", [group.pos]);
    socket.emit("request group", group.id);
  };

  useEffect(() => {
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
      <InfoBox title="Resources" className="w-full">
        <p className="text-center text-gray-400 italic">
          No resources available
        </p>
      </InfoBox>
    );
  }

  return (
    <InfoBox title="Resources" className="w-full">
      <div className="grid grid-cols-3 gap-4">
        <div className="font-semibold text-center">Group Resources</div>
        <div className="font-semibold text-center">Transfer</div>
        <div className="font-semibold text-center">Tile Resources</div>

        {resourceKeys.map((resourceKey) => (
          <div key={resourceKey} className="contents">
            <div className="bg-gray-800 p-2 rounded text-center">
              <div className="capitalize text-sm text-gray-400 mb-1">
                {resourceKey}
              </div>
              <div className="font-medium">
                {group.resources[resourceKey as keyof typeof group.resources] ||
                  0}
              </div>
            </div>

            <div className="flex justify-center items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  requestResourceTransfer(
                    group,
                    resourceKey,
                    TransferDirection.group
                  )
                }
              >
                &larr;
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  requestResourceTransfer(
                    group,
                    resourceKey,
                    TransferDirection.tile
                  )
                }
              >
                &rarr;
              </Button>
            </div>

            <div className="bg-gray-800 p-2 rounded text-center">
              <div className="capitalize text-sm text-gray-400 mb-1">
                {resourceKey}
              </div>
              <div className="font-medium">
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
