import { Building } from "@shared/objects";
import { useStore } from "@/lib/state";
import { InfoBox, InfoRow, InfoDivider } from "./InfoBox";
import { Button } from "./ui/Button";
import { equals } from "@shared/hex";
import UnitHiring from "./UnitHiring";
import PlayerRelation from "./ui/PlayerRelation";

interface BuildingInfoProps {
  building: Building;
}

const BuildingInfo = ({ building }: BuildingInfoProps) => {
  const world = useStore((state) => state.world);
  const userId = useStore((state) => state.userId);
  const engine = useStore((state) => state.engine);

  if (!building) {
    return <div>No building selected</div>;
  }

  const isOwnBuilding = building.owner === userId;

  // Get units at the same position as the building
  const availableUnits = Object.values(world.units).filter(
    (unit) => equals(unit.pos, building.position) && unit.owner === userId
  );

  // Get IDs of units already assigned to any slot in THIS building
  const assignedUnitIdsInCurrentBuilding = new Set(
    building.slots
      .map((slot) => slot.assignedUnitId)
      .filter((id) => id != null)
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

  // If it's not our building, show a simplified view
  if (!isOwnBuilding) {
    return (
      <div className="inline-grid grid-cols-1 gap-2 p-2 h-full">
        <InfoBox title="Building Details" className="h-full overflow-y-auto">
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

          <PlayerRelation playerId={building.owner} />
        </InfoBox>
      </div>
    );
  }

  return (
    <div className="inline-grid grid-cols-[minmax(250px,auto)_minmax(350px,auto)_auto] gap-2 p-2 h-full">
      <InfoBox title="Building Details" className="h-full overflow-y-auto">
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

        {canUpgrade && (
          <>
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
                      value={`${Math.floor(available)}/${Math.floor(amount)}`}
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

      <InfoBox title="Resource Slots" className="h-full overflow-y-auto">
        {building.slots.map((slot, index) => {
          const assignedUnit = slot.assignedUnitId
            ? world.units[slot.assignedUnitId]
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

                {assignedUnit ? (
                  <div className="text-right">
                    <p className="text-xs">
                      Assigned: Unit #{assignedUnit.id}
                    </p>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() =>
                        engine.requestUnitUnassignment(assignedUnit.id)
                      }
                    >
                      Unassign
                    </Button>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">No unit assigned</p>
                  </div>
                )}
              </div>

              {!assignedUnit && (
                <div className="mt-2">
                  <h5 className="text-xs text-gray-400 mb-1">Assign Unit:</h5>
                  {(() => {
                    const assignableUnitsForSlot = availableUnits.filter(
                      (unit) =>
                        !unit.assignedToBuilding &&
                        !assignedUnitIdsInCurrentBuilding.has(unit.id)
                    );

                    if (assignableUnitsForSlot.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-1">
                          {assignableUnitsForSlot.map((unit) => (
                            <Button
                              key={unit.id}
                              variant="outline"
                              size="xs"
                              onClick={() =>
                                engine.requestUnitAssignment(
                                  unit.id,
                                  building.id,
                                  index
                                )
                              }
                            >
                              Unit #{unit.id}
                            </Button>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-xs text-gray-500 italic">
                          No units available to assign.
                        </p>
                      );
                    }
                  })()}
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

      <UnitHiring building={building} />
    </div>
  );
};

export default BuildingInfo;
