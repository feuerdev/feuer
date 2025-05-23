import { Group } from "@shared/objects";
import { getTileByPos } from "@shared/objectutil";
import ResourceInfo from "./ResourceInfo";
import { InfoBox, InfoRow, InfoDivider } from "./InfoBox";
import { Button } from "./ui/Button";
import { useStore } from "@/lib/state";
import { Engine } from "@/lib/engine";

const GroupInfo = ({ group, engine }: { group: Group; engine: Engine }) => {
  const world = useStore((state) => state.world);
  const socket = useStore((state) => state.socket);

  if (!group) {
    return <div>No group selected</div>;
  }

  const tile = getTileByPos(group.pos, world.tiles);

  if (!tile) {
    return <div>Group is not on a tile?</div>;
  }

  // Get assigned building info if applicable
  const assignedBuilding =
    group.assignedToBuilding !== undefined
      ? world.buildings[group.assignedToBuilding]
      : undefined;

  const assignedSlot =
    assignedBuilding && group.assignedToSlot !== undefined
      ? assignedBuilding.slots[group.assignedToSlot]
      : undefined;

  return (
    <div className="flex gap-2 p-2 h-full">
      <InfoBox title="Group Details" className="h-full max-w-[250px]">
        <InfoRow label="Position" value={`${group.pos.q}:${group.pos.r}`} />
        <InfoRow
          label="Status"
          value={
            group.targetHexes?.length > 0
              ? `Moving (${group.movementStatus.toFixed()} %)`
              : assignedBuilding
              ? `Working at ${assignedBuilding.key}`
              : "Waiting"
          }
        />
        <InfoRow label="Spotting" value={group.spotting} />
        <InfoRow label="Units" value={group.units.length} />

        {assignedBuilding && assignedSlot && (
          <>
            <InfoDivider />
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">Assignment</h3>
              <InfoRow label="Building" value={assignedBuilding.key} />
              <InfoRow
                label="Slot"
                value={`${assignedSlot.resourceType} (${(
                  assignedSlot.efficiency * 100
                ).toFixed(0)}%)`}
              />
              <div className="mt-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => engine.requestGroupUnassignment(group.id)}
                >
                  Unassign from Building
                </Button>
              </div>
            </div>
          </>
        )}

        <InfoDivider />
        <div className="mt-2">
          <h3 className="text-sm font-semibold mb-1">Gathering Efficiency</h3>
          <InfoRow
            label="Wood"
            value={`${(group.gatheringEfficiency.wood * 100).toFixed(0)}%`}
          />
          <InfoRow
            label="Stone"
            value={`${(group.gatheringEfficiency.stone * 100).toFixed(0)}%`}
          />
          <InfoRow
            label="Food"
            value={`${(group.gatheringEfficiency.food * 100).toFixed(0)}%`}
          />
          <InfoRow
            label="Iron"
            value={`${(group.gatheringEfficiency.iron * 100).toFixed(0)}%`}
          />
          <InfoRow
            label="Gold"
            value={`${(group.gatheringEfficiency.gold * 100).toFixed(0)}%`}
          />
        </div>
      </InfoBox>

      <InfoBox title="Units" className="h-full flex-1">
        <div className="max-h-48 overflow-auto pr-1">
          {group.units.length === 0 ? (
            <p className="text-gray-400 italic text-xs">
              No units in this group
            </p>
          ) : (
            group.units.map((unit, index) => (
              <div key={unit.id} className="mb-1">
                {index > 0 && <InfoDivider />}
                <InfoRow label="ID" value={unit.id} />
                <InfoRow label="Name" value={unit.name || "Unnamed"} />

                <div className="grid grid-cols-2 gap-x-2 mt-1">
                  <InfoRow label="Strength" value={unit.strength} />
                  <InfoRow label="Endurance" value={unit.endurance} />
                  <InfoRow label="Leadership" value={unit.leadership} />
                  <InfoRow label="Courage" value={unit.courage} />
                </div>

                <div className="mt-1">
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() =>
                      socket?.emit("request unit remove", {
                        groupId: group.id,
                        unitId: unit.id,
                      })
                    }
                  >
                    Remove Unit
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </InfoBox>

      <ResourceInfo group={group} tile={tile} className="h-full flex-1" />
    </div>
  );
};

export default GroupInfo;
