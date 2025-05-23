import { Building, Group } from "@shared/objects";
import { useStore } from "@/lib/state";
import { InfoBox, InfoRow, InfoDivider } from "./InfoBox";
import { Button } from "./ui/Button";
import { Engine } from "@/lib/engine";
import { equals } from "@shared/hex";

interface BuildingInfoProps {
  building: Building;
  engine: Engine;
}

const BuildingInfo = ({ building, engine }: BuildingInfoProps) => {
  const world = useStore((state) => state.world);
  const userId = useStore((state) => state.userId);

  if (!building) {
    return <div>No building selected</div>;
  }

  // Get groups at the same position as the building
  const availableGroups = Object.values(world.groups).filter(
    (group) => equals(group.pos, building.position) && group.owner === userId
  );

  // Check if building can be upgraded
  const canUpgrade =
    building.level < building.maxLevel && building.upgradeRequirements;

  // Check if we have enough resources for upgrade
  const hasEnoughResources =
    canUpgrade && building.upgradeRequirements
      ? Object.entries(building.upgradeRequirements).every(
          ([resource, amount]) => {
            const tile = Object.values(world.tiles).find((tile) =>
              equals(tile.hex, building.position)
            );
            return (
              tile &&
              (tile.resources[resource as keyof typeof tile.resources] || 0) >=
                amount
            );
          }
        )
      : false;

  return (
    <div className="flex gap-2 p-2 h-full">
      <InfoBox title="Building Details" className="h-full max-w-[250px]">
        <InfoRow label="Name" value={building.key} />
        <InfoRow
          label="Level"
          value={`${building.level}/${building.maxLevel}`}
        />
        <InfoRow
          label="Position"
          value={`${building.position.q}, ${building.position.r}`}
        />
        <InfoRow label="Owner" value={building.owner} />
        <InfoRow label="Spotting" value={building.spotting} />

        <InfoDivider />

        <div className="mt-2">
          <h3 className="text-sm font-semibold mb-1">Production</h3>
          {Object.entries(building.production).map(([resource, amount]) => (
            <InfoRow key={resource} label={resource} value={amount} />
          ))}
        </div>

        {canUpgrade && (
          <>
            <InfoDivider />

            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">
                Upgrade Requirements
              </h3>
              {Object.entries(building.upgradeRequirements || {}).map(
                ([resource, amount]) => {
                  // Check if this specific resource is sufficient on the tile
                  const tile = Object.values(world.tiles).find((tile) =>
                    equals(tile.hex, building.position)
                  );
                  const available = tile
                    ? tile.resources[resource as keyof typeof tile.resources] ||
                      0
                    : 0;
                  const isInsufficient = available < amount;

                  return (
                    <InfoRow
                      key={resource}
                      label={resource}
                      value={`${available}/${amount}`}
                      valueClassName={
                        isInsufficient ? "text-red-500" : "text-green-500"
                      }
                    />
                  );
                }
              )}

              <div className="mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!hasEnoughResources}
                  onClick={() => engine.requestBuildingUpgrade(building.id)}
                >
                  Upgrade to Level {building.level + 1}
                </Button>
              </div>
            </div>
          </>
        )}
      </InfoBox>

      <InfoBox title="Resource Slots" className="h-full flex-1">
        {building.slots.map((slot, index) => {
          const assignedGroup = slot.assignedGroupId
            ? world.groups[slot.assignedGroupId]
            : undefined;

          return (
            <div
              key={index}
              className="mb-3 p-2 bg-gray-800 bg-opacity-50 rounded"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold capitalize">
                    {slot.resourceType} Slot
                  </h4>
                  <p className="text-xs text-gray-400">
                    Efficiency: {(slot.efficiency * 100).toFixed(0)}%
                  </p>
                </div>

                {assignedGroup ? (
                  <div className="text-right">
                    <p className="text-xs">
                      Assigned: Group #{assignedGroup.id}
                    </p>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() =>
                        engine.requestGroupUnassignment(assignedGroup.id)
                      }
                    >
                      Unassign
                    </Button>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">No group assigned</p>
                  </div>
                )}
              </div>

              {!assignedGroup && availableGroups.length > 0 && (
                <div className="mt-2">
                  <h5 className="text-xs text-gray-400 mb-1">Assign Group:</h5>
                  <div className="flex flex-wrap gap-1">
                    {availableGroups
                      .filter((group) => !group.assignedToBuilding)
                      .map((group) => (
                        <Button
                          key={group.id}
                          variant="outline"
                          size="xs"
                          onClick={() =>
                            engine.requestGroupAssignment(
                              group.id,
                              building.id,
                              index
                            )
                          }
                        >
                          Group #{group.id}
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {building.slots.length === 0 && (
          <p className="text-center text-gray-400 italic text-xs">
            No slots available in this building
          </p>
        )}
      </InfoBox>
    </div>
  );
};

export default BuildingInfo;
