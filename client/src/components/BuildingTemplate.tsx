import { TBuildingTemplate, Tile } from "@shared/objects";
import { Button } from "./ui/Button";
import { useStore } from "@/lib/state";
import { equals } from "@shared/hex";

const BuildingTemplate = ({
  building,
  tile,
}: {
  building: TBuildingTemplate;
  tile: Tile;
}) => {
  const socket = useStore((state) => state.socket);
  const world = useStore((state) => state.world);

  // Count buildings on this tile
  const buildingsOnTile = Object.values(world.buildings).filter((b) =>
    equals(b.position, tile.hex)
  ).length;

  const isBuildingLimitReached = buildingsOnTile >= 3;

  // Check if tile has enough resources for building
  const hasEnoughResources = Object.entries(building.cost).every(
    ([resource, amount]) =>
      (tile.resources[resource as keyof typeof tile.resources] || 0) >= amount
  );

  // Determine if build button should be disabled
  const buildDisabled = isBuildingLimitReached || !hasEnoughResources;

  // Get tooltip message based on the reason for disabling
  const getTooltipMessage = () => {
    if (isBuildingLimitReached)
      return "Maximum of 3 buildings per tile reached";
    if (!hasEnoughResources) return "Not enough resources on tile";
    return "";
  };

  return (
    <div className="flex items-center gap-2 p-1 mb-1 bg-gray-800 bg-opacity-50 rounded">
      <div className="flex-1">
        <h3 className="font-semibold text-white text-sm">{building.name}</h3>
        <div className="grid grid-cols-2 gap-x-2 mt-0.5 text-xs text-gray-300">
          <div>Spotting: {building.spotting}</div>
          <div>
            Cost:{" "}
            {Object.entries(building.cost).map(([resource, amount], index) => {
              // Check if this specific resource is insufficient on the tile
              const isInsufficient =
                (tile.resources[resource as keyof typeof tile.resources] || 0) <
                amount;

              return (
                <span
                  key={resource}
                  className={isInsufficient ? "text-red-500" : ""}
                >
                  {index > 0 ? ", " : ""}
                  {resource}: {amount}
                </span>
              );
            })}
          </div>
          <div className="col-span-2">
            Production:{" "}
            {Object.entries(building.production)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")}
          </div>
        </div>
      </div>
      <div title={getTooltipMessage()}>
        <Button
          variant="primary"
          size="xs"
          disabled={buildDisabled}
          onClick={() =>
            socket?.emit("request construction", {
              pos: tile.hex,
              type: building.key,
            })
          }
        >
          Build
        </Button>
      </div>
    </div>
  );
};

export default BuildingTemplate;
