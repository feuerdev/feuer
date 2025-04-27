"use client";

import { useSocket } from "@/components/hooks/useSocket";
import { TBuildingTemplate, Tile } from "@shared/objects";
import { Button } from "../ui/button";

const BuildingTemplate = ({
  building,
  tile,
}: {
  building: TBuildingTemplate;
  tile: Tile;
}) => {
  const { socket } = useSocket();

  return (
    <div className="flex items-center gap-3 p-2 mb-2 bg-gray-800 bg-opacity-50 rounded">
      <img
        className="w-12 h-12 object-contain"
        src={`img/${building.texture}.png`}
        alt={building.name}
      />
      <div className="flex-1">
        <h3 className="font-semibold text-white">{building.name}</h3>
        <div className="grid grid-cols-2 gap-x-4 mt-1 text-sm text-gray-300">
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
        size="sm"
        onClick={() =>
          socket.emit("request construction", {
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
