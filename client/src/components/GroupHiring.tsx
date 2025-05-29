import { Building } from "@shared/objects";
import { useStore } from "@/lib/state";
import { Button } from "./ui/Button";
import { InfoBox } from "./InfoBox";
import { hash } from "@shared/hex";

interface GroupHiringProps {
  building: Building;
}

// Define resource keys to ensure type safety
type ResourceKey = "berries" | "wood" | "stone";

// Define group cost with proper typing
const GROUP_COST: Record<ResourceKey, number> = {
  berries: 15,
  wood: 5,
  stone: 5,
};

const GroupHiring = ({ building }: GroupHiringProps) => {
  const world = useStore((state) => state.world);
  const engine = useStore((state) => state.engine);
  const tile = world.tiles[hash(building.position)];

  if (!tile) {
    return null;
  }

  // Check if there are enough resources to hire a group
  const canAfford = () => {
    for (const [resource, amount] of Object.entries(GROUP_COST)) {
      const resourceKey = resource as ResourceKey;
      if ((tile.resources[resourceKey] || 0) < amount) {
        return false;
      }
    }
    return true;
  };

  return (
    <InfoBox title="Hire Group">
      <div className="p-2 border border-gray-700 rounded-md bg-gray-800">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">New Group</h3>
          <Button
            variant="primary"
            size="sm"
            disabled={!canAfford()}
            onClick={() => engine.requestHireGroup(building.id, "Group")}
          >
            Hire
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-1">
          Hire a new group with random attributes
        </p>

        <div className="mt-2">
          <h4 className="text-xs font-medium">Cost:</h4>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {Object.entries(GROUP_COST).map(([resource, amount]) => {
              const resourceKey = resource as ResourceKey;
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
                  {Math.floor(tile.resources[resourceKey] || 0)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </InfoBox>
  );
};

export default GroupHiring;
