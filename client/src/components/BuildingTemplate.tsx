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

  return (
    <div className="flex items-center gap-2 p-1 mb-1 bg-gray-800 bg-opacity-50 rounded">
      <div className="flex-1">
        <h3 className="font-semibold text-white text-sm">{building.name}</h3>
        <div className="grid grid-cols-2 gap-x-2 mt-0.5 text-xs text-gray-300">
          <div>Spotting: {building.spotting}</div>
          <div>
            Cost:{" "}
            {Object.entries(building.cost)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")}
          </div>
          <div className="col-span-2">
            Production:{" "}
            {Object.entries(building.production)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")}
          </div>
        </div>
      </div>
      <Button
        variant="primary"
        size="xs"
        disabled={isBuildingLimitReached}
        title={
          isBuildingLimitReached
            ? "Maximum of 3 buildings per tile reached"
            : ""
        }
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
  );
};

export default BuildingTemplate;
