import { equals } from "@shared/hex";
import { TBuildingTemplate, Tile } from "@shared/objects";
import Buildings from "@shared/templates/buildings.json";
import BuildingTemplate from "./BuildingTemplate";
import ResourceInfo from "./ResourceInfo";
import { useStore } from "@/lib/state";
import { InfoBox, InfoRow } from "./InfoBox";

const TileInfo = ({ tile }: { tile: Tile }) => {
  const world = useStore((state) => state.world);
  const userId = useStore((state) => state.userId);

  if (!tile) {
    return <div>No tile selected</div>;
  }

  // TODO: What to do if there are multiple groups on the same tile?
  const group = Object.values(world.groups).find((group) => {
    return equals(group.pos, tile.hex) && group.owner === userId;
  });

  const building = Object.values(world.buildings).find((building) => {
    return equals(building.position, tile.hex) && building.owner === userId;
  });

  return (
    <div className="flex gap-2 p-2 h-full">
      <InfoBox title="Tile Details" className="h-full max-w-[250px]">
        <InfoRow label="Position" value={`${tile.hex.q}, ${tile.hex.r}`} />
        <InfoRow label="Biome" value={getBiomeName(tile.biome)} />
        <InfoRow label="Height" value={tile.height.toFixed(1)} />
        <InfoRow label="Precipitation" value={tile.precipitation.toFixed(1)} />
        <InfoRow label="Temperature" value={tile.temperature.toFixed(1)} />

        <InfoRow
          label="Buildings"
          value={`${
            Object.values(world.buildings).filter((b) =>
              equals(b.position, tile.hex)
            ).length
          }/3`}
        />
      </InfoBox>

      {(building || group) && (
        <InfoBox
          title="Available Buildings (Max: 3)"
          className="h-full flex-1 overflow-y-auto"
        >
          {Object.keys(Buildings).length === 0 ? (
            <p className="text-gray-400 italic text-xs">
              No building templates available
            </p>
          ) : (
            Object.keys(Buildings).map((buildingKey) => (
              <BuildingTemplate
                key={buildingKey}
                tile={tile}
                building={
                  Buildings[
                    buildingKey as keyof typeof Buildings
                  ] as TBuildingTemplate
                }
              />
            ))
          )}
        </InfoBox>
      )}

      {group && (
        <ResourceInfo group={group} tile={tile} className="h-full flex-1" />
      )}
    </div>
  );
};

// Helper function to get biome name from biome enum value
function getBiomeName(biomeValue: number): string {
  const biomeNames: Record<number, string> = {
    0: "None",
    1: "Ice",
    2: "Tundra",
    3: "Boreal",
    4: "Temperate",
    5: "Tropical",
    6: "Grassland",
    7: "Desert",
    8: "Ocean",
    9: "Shore",
    10: "Treeline",
    11: "Mountain",
    12: "Beach",
    13: "Peaks",
    14: "River",
  };

  return biomeNames[biomeValue] || `Unknown (${biomeValue})`;
}

export default TileInfo;
