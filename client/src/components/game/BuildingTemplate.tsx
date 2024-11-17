"use client";

import socket from "@/lib/socket";
import { TBuildingTemplate, Tile } from "@shared/objects";

const BuildingTemplate = ({
  building,
  tile,
}: {
  building: TBuildingTemplate;
  tile: Tile;
}) => {
  return (
    <div className="flex gap-4">
      <img
        className="w-16 h-16 self-center"
        src={"img/" + building.texture + ".png"}
        alt={building.name}
      />
      <div>
        <h3>{building.name}</h3>
        <p>Spotting: {building.spotting}</p>
        <p>Cost: {JSON.stringify(building.cost)}</p>
        <p>Production: {JSON.stringify(building.production)}</p>
      </div>
      <button
        onClick={() =>
          socket.emit("request construction", {
            pos: tile.hex,
            type: building.key,
          })
        }
      >
        Construct
      </button>
    </div>
  );
};

export default BuildingTemplate;
