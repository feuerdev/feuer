import { useEffect } from "react";
import { Unit, Tile } from "@shared/objects";
import { useStore } from "@/lib/state";
import { InfoBox } from "./InfoBox";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

/**
 * React Component to display resource information and display controls to transfer resources between tile and units
 */
const ResourceInfo = ({
  unit,
  tile,
  className,
}: {
  unit: Unit;
  tile: Tile;
  className?: string;
}) => {
  const socket = useStore((state) => state.socket);

  const requestResourceTransfer = (
    currentUnit: Unit,
    resource: string,
    socketAmount: number // Positive: Unit to Tile, Negative: Tile to Unit
  ) => {
    socket?.emit("request transfer", {
      unitId: currentUnit.id,
      resource: resource,
      amount: socketAmount,
    });
    socket?.emit("request tiles", [currentUnit.pos]);
    socket?.emit("request unit", currentUnit.id);
  };

  useEffect(() => {
    if (!socket) return;

    const interval = setInterval(() => {
      socket.emit("request tiles", [unit.pos]);
    }, 500);
    return () => clearInterval(interval);
  }, [unit.pos, socket]);

  // Get all unique resource keys from both unit and tile
  const resourceKeys = [
    ...new Set([
      ...Object.keys(unit.resources),
      ...Object.keys(tile.resources),
    ]),
  ].filter(
    (key) =>
      (unit.resources[key as keyof typeof unit.resources] || 0) > 0 ||
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
        <div className="font-semibold text-center text-xs">Unit</div>
        <div className="font-semibold text-center text-xs">Transfer</div>
        <div className="font-semibold text-center text-xs">Tile</div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex flex-col pt-1">
        {" "}
        {/* Adjusted to remove pr-1 as InfoBox has p-2 */}
        <div className="grid grid-cols-[80px_1fr_80px] gap-1 items-stretch">
          {resourceKeys.map((resourceKey) => {
            const unitAmount = Math.floor(
              unit.resources[resourceKey as keyof typeof unit.resources] || 0
            );
            const tileAmount = Math.floor(
              tile.resources[resourceKey as keyof typeof tile.resources] || 0
            );

            return (
              <div key={resourceKey} className="contents">
                <div className="bg-gray-800 p-0.5 rounded text-center flex flex-col justify-center min-h-[36px]">
                  <div className="capitalize text-xs text-gray-400 truncate">
                    {resourceKey}
                  </div>
                  <div className="font-medium text-xs">{unitAmount}</div>
                </div>

                {/* Transfer Controls */}
                <div className="flex flex-col items-center justify-center gap-1 py-1 px-0.5 border-x border-gray-700">
                  {/* To Unit (from Tile) */}
                  <div className="flex flex-row items-center w-full">
                    <span className="text-xs text-gray-400 pl-1 mr-1">
                      To Unit &larr;
                    </span>
                    <div className="flex justify-center gap-0.5 flex-wrap flex-1">
                      {transferButtonValues.map((amount) => (
                        <Button
                          key={`toUnit-${resourceKey}-${amount}`}
                          size="xs"
                          variant="outline"
                          className="min-w-0 px-1.5 py-0.5 text-xs"
                          onClick={() =>
                            requestResourceTransfer(unit, resourceKey, -amount)
                          }
                          disabled={tileAmount < amount || amount <= 0}
                        >
                          {amount}
                        </Button>
                      ))}
                      <Button
                        key={`toUnit-${resourceKey}-all`}
                        size="xs"
                        variant="outline"
                        className="min-w-0 px-1.5 py-0.5 text-xs"
                        onClick={() =>
                          requestResourceTransfer(
                            unit,
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

                  {/* To Tile (from Unit) */}
                  <div className="flex flex-row items-center w-full">
                    <div className="flex justify-center gap-0.5 flex-wrap flex-1">
                      {transferButtonValues.map((amount) => (
                        <Button
                          key={`toTile-${resourceKey}-${amount}`}
                          size="xs"
                          variant="outline"
                          className="min-w-0 px-1.5 py-0.5 text-xs"
                          onClick={() =>
                            requestResourceTransfer(unit, resourceKey, amount)
                          }
                          disabled={unitAmount < amount || amount <= 0}
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
                            unit,
                            resourceKey,
                            unitAmount
                          )
                        }
                        disabled={unitAmount <= 0}
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
