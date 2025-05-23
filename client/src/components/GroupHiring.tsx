import { Building } from "@shared/objects";
import { useStore } from "@/lib/state";
import { Button } from "./ui/Button";
import { InfoBox, InfoRow } from "./InfoBox";
import { Engine } from "@/lib/engine";
import Rules from "@shared/rules.json";

interface GroupHiringProps {
  building: Building;
  engine: Engine;
}

interface GroupTemplate {
  name: string;
  description: string;
  cost: Record<string, number>;
  spotting: number;
}

const GroupHiring = ({ building, engine }: GroupHiringProps) => {
  const world = useStore((state) => state.world);
  const tile = world.tiles[building.position.q + "," + building.position.r];

  if (!tile) {
    return null;
  }

  // Get available group templates from rules
  const availableGroups: [string, GroupTemplate][] = Object.entries(
    Rules.units
  ).map(([key, template]) => [key, template as GroupTemplate]);

  // Check if there are enough resources for each group type
  const canAfford = (cost: Record<string, number>) => {
    for (const [resource, amount] of Object.entries(cost)) {
      if ((tile.resources[resource] || 0) < amount) {
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

            <div className="mt-2">
              <h4 className="text-xs font-medium">Cost:</h4>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {Object.entries(template.cost).map(([resource, amount]) => (
                  <div
                    key={resource}
                    className={`text-xs ${
                      (tile.resources[resource] || 0) < amount
                        ? "text-red-400"
                        : "text-gray-300"
                    }`}
                  >
                    {resource}: {amount} / {tile.resources[resource] || 0}
                  </div>
                ))}
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
