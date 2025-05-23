import { Building } from "@shared/objects";
import { useStore } from "@/lib/state";
import { Button } from "./ui/Button";
import { InfoBox } from "./InfoBox";
import { Engine } from "@/lib/engine";
import Rules from "@shared/rules.json";
import { hash } from "@shared/hex";
import { Resources } from "@shared/resources";

interface GroupHiringProps {
  building: Building;
  engine: Engine;
}

interface GroupTemplate {
  name: string;
  description: string;
  cost: Partial<Resources>;
  spotting: number;
  strength?: number;
  endurance?: number;
  attack?: number;
  defense?: number;
  gathering?: {
    wood: number;
    stone: number;
    food: number;
    iron: number;
    gold: number;
  };
}

const GroupHiring = ({ building, engine }: GroupHiringProps) => {
  const world = useStore((state) => state.world);
  const tile = world.tiles[hash(building.position)];

  if (!tile) {
    return null;
  }

  // Get available group templates from rules
  const availableGroups: [string, GroupTemplate][] = Object.entries(
    Rules.units
  ).map(([key, template]) => [key, template as GroupTemplate]);

  // Check if there are enough resources for each group type
  const canAfford = (cost: Partial<Resources>) => {
    for (const [resource, amount] of Object.entries(cost)) {
      const resourceKey = resource as keyof Resources;
      if ((tile.resources[resourceKey] || 0) < amount) {
        return false;
      }
    }
    return true;
  };

  return (
    <InfoBox title="Hire Groups" className="mt-4">
      <div className="grid gap-2">
        {availableGroups.map(([groupType, template]) => (
          <div
            key={groupType}
            className="border border-gray-700 rounded-md p-2 bg-gray-800"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">
                {template.name || groupType}
              </h3>
              <Button
                variant="primary"
                size="xs"
                disabled={!canAfford(template.cost)}
                onClick={() => engine.requestHireGroup(building.id, groupType)}
              >
                Hire
              </Button>
            </div>

            <p className="text-xs text-gray-400 mt-1">
              {template.description || `A ${groupType} group`}
            </p>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <h4 className="text-xs font-medium">Cost:</h4>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {Object.entries(template.cost).map(([resource, amount]) => {
                    const resourceKey = resource as keyof Resources;
                    return (
                      <div
                        key={resource}
                        className={`text-xs ${
                          (tile.resources[resourceKey] || 0) < amount
                            ? "text-red-400"
                            : "text-gray-300"
                        }`}
                      >
                        {resource}: {amount} /{" "}
                        {tile.resources[resourceKey] || 0}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium">Stats:</h4>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <div className="text-xs text-gray-300">
                    Attack: {template.attack || 5}
                  </div>
                  <div className="text-xs text-gray-300">
                    Defense: {template.defense || 5}
                  </div>
                  {template.gathering && (
                    <div className="text-xs text-gray-300 col-span-2">
                      {Object.entries(template.gathering)
                        .filter(([_, value]) => value > 1.0)
                        .map(([resource, value]) => (
                          <span key={resource} className="mr-1">
                            {resource}: {value.toFixed(1)}x
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {availableGroups.length === 0 && (
          <p className="text-center text-gray-400 italic text-xs">
            No group types available
          </p>
        )}
      </div>
    </InfoBox>
  );
};

export default GroupHiring;
