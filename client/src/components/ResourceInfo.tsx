import { useEffect } from "react";
import { Group, Tile } from "@shared/objects";
import { useStore } from "@/lib/state";
import { InfoBox } from "./InfoBox";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

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
    currentGroup: Group,
    resource: string,
    socketAmount: number // Positive: Group to Tile, Negative: Tile to Group
  ) => {
    socket?.emit("request transfer", {
      groupId: currentGroup.id,
      resource: resource,
      amount: socketAmount,
    });
    socket?.emit("request tiles", [currentGroup.pos]);
    socket?.emit("request group", currentGroup.id);
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
      <InfoBox title="Resources" className={cn(className, "overflow-y-auto")}>
        <p className="text-center text-gray-400 italic text-xs">
          No resources available
        </p>
      </InfoBox>
    );
  }

  const transferButtonValues = [1, 10, 100];

  return (
    <InfoBox title="Resources" className={cn(className, "overflow-y-auto")}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-slate-900 grid grid-cols-[80px_1fr_80px] gap-1 text-xs flex-shrink-0 py-1 px-2 -mx-2">
        <div className="font-semibold text-center text-xs">Group</div>
        <div className="font-semibold text-center text-xs">Transfer</div>
        <div className="font-semibold text-center text-xs">Tile</div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex flex-col pt-1">
        {" "}
        {/* Adjusted to remove pr-1 as InfoBox has p-2 */}
        <div className="grid grid-cols-[80px_1fr_80px] gap-1 items-stretch">
          {resourceKeys.map((resourceKey) => {
            const groupAmount = Math.floor(
              group.resources[resourceKey as keyof typeof group.resources] || 0
            );
            const tileAmount = Math.floor(
              tile.resources[resourceKey as keyof typeof tile.resources] || 0
            );

            return (
              <div key={resourceKey} className="contents">
                {/* Group Resource Display */}
                <div className="bg-gray-800 p-0.5 rounded text-center flex flex-col justify-center min-h-[36px]">
                  <div className="capitalize text-xs text-gray-400 truncate">
                    {resourceKey}
                  </div>
                  <div className="font-medium text-xs">{groupAmount}</div>
                </div>

                {/* Transfer Controls */}
                <div className="flex flex-col items-center justify-center gap-1 py-1 px-0.5 border-x border-gray-700">
                  {/* To Group (from Tile) */}
                  <div className="flex flex-row items-center w-full">
                    <span className="text-xs text-gray-400 pl-1 mr-1">
                      To Group &larr;
                    </span>
                    <div className="flex justify-center gap-0.5 flex-wrap flex-1">
                      {transferButtonValues.map((amount) => (
                        <Button
                          key={`toGroup-${resourceKey}-${amount}`}
                          size="xs"
                          variant="outline"
                          className="min-w-0 px-1.5 py-0.5 text-xs"
                          onClick={() =>
                            requestResourceTransfer(group, resourceKey, -amount)
                          }
                          disabled={tileAmount < amount || amount <= 0}
                        >
                          {amount}
                        </Button>
                      ))}
                      <Button
                        key={`toGroup-${resourceKey}-all`}
                        size="xs"
                        variant="outline"
                        className="min-w-0 px-1.5 py-0.5 text-xs"
                        onClick={() =>
                          requestResourceTransfer(
                            group,
                            resourceKey,
                            -tileAmount
                          )
                        }
                        disabled={tileAmount <= 0}
                      >
                        All
                      </Button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-full h-px bg-gray-700 my-1"></div>

                  {/* To Tile (from Group) */}
                  <div className="flex flex-row items-center w-full">
                    <div className="flex justify-center gap-0.5 flex-wrap flex-1">
                      {transferButtonValues.map((amount) => (
                        <Button
                          key={`toTile-${resourceKey}-${amount}`}
                          size="xs"
                          variant="outline"
                          className="min-w-0 px-1.5 py-0.5 text-xs"
                          onClick={() =>
                            requestResourceTransfer(group, resourceKey, amount)
                          }
                          disabled={groupAmount < amount || amount <= 0}
                        >
                          {amount}
                        </Button>
                      ))}
                      <Button
                        key={`toTile-${resourceKey}-all`}
                        size="xs"
                        variant="outline"
                        className="min-w-0 px-1.5 py-0.5 text-xs"
                        onClick={() =>
                          requestResourceTransfer(
                            group,
                            resourceKey,
                            groupAmount
                          )
                        }
                        disabled={groupAmount <= 0}
                      >
                        All
                      </Button>
                    </div>
                    <span className="text-xs text-gray-400 pr-1 ml-1">
                      &rarr; To Tile
                    </span>
                  </div>
                </div>

                {/* Tile Resource Display */}
                <div className="bg-gray-800 p-0.5 rounded text-center flex flex-col justify-center min-h-[36px]">
                  <div className="capitalize text-xs text-gray-400 truncate">
                    {resourceKey}
                  </div>
                  <div className="font-medium text-xs">{tileAmount}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </InfoBox>
  );
};

export default ResourceInfo;
