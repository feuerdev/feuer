import { equals } from "@shared/hex";
import { TBuildingTemplate, Tile } from "@shared/objects";
import Buildings from "@shared/templates/buildings.json";
import BuildingTemplate from "./BuildingTemplate";
import ResourceInfo from "./ResourceInfo";
import { useStore } from "@/lib/state";
import { InfoBox, InfoRow } from "./InfoBox";

const TileInfo = ({ tile }: { tile: Tile }) => {
  const world = useStore((state) => state.world);

  if (!tile) {
    return <div>No tile selected</div>;
  }

  // TODO: What to do if there are multiple groups on the same tile?
  const group = Object.values(world.groups).find((group) => {
    return equals(group.pos, tile.hex);
  });

  return (
    <div className="flex flex-nowrap gap-2 p-2 overflow-x-auto">
      <InfoBox title="Tile Details" className="w-60 shrink-0">
        <InfoRow label="Position" value={`${tile.hex.q}, ${tile.hex.r}`} />
        <InfoRow label="Biome" value={getBiomeName(tile.biome)} />
        <InfoRow label="Height" value={tile.height.toFixed(2)} />
        <InfoRow label="Precipitation" value={tile.precipitation.toFixed(2)} />
        <InfoRow label="Temperature" value={tile.temperature.toFixed(2)} />
      </InfoBox>

      <InfoBox title="Available Buildings" className="w-64 shrink-0">
        <div className="max-h-48 overflow-auto pr-1">
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
        </div>
      </InfoBox>

      {group && (
        <ResourceInfo group={group} tile={tile} className="w-80 shrink-0" />
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
