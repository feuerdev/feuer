import { Group } from "@shared/objects";
import { getTileByPos } from "@shared/objectutil";
import ResourceInfo from "./ResourceInfo";
import { InfoBox, InfoRow, InfoDivider } from "./InfoBox";
import { Button } from "./ui/Button";
import { useStore } from "@/lib/state";
import { Engine } from "@/lib/engine";
import { useState } from "react";

const GroupInfo = ({ group, engine }: { group: Group; engine: Engine }) => {
  const world = useStore((state) => state.world);
  const socket = useStore((state) => state.socket);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | null>(
    null
  );

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

  const selectedUnit =
    selectedUnitIndex !== null ? group.units[selectedUnitIndex] : null;

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
        <div className="flex h-full">
          <div className="w-1/3 border-r border-gray-700 pr-2 h-full overflow-y-auto">
            {group.units.map((unit, index) => (
              <div
                key={unit.id}
                className={`p-2 mb-1 cursor-pointer rounded ${
                  selectedUnitIndex === index
                    ? "bg-gray-700"
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setSelectedUnitIndex(index)}
              >
                <div className="font-medium text-sm">{unit.name}</div>
                <div className="text-xs text-gray-400">
                  Morale: {unit.morale}%
                </div>
                {unit.injuries.length > 0 && (
                  <div className="text-xs text-red-400">
                    Injuries: {unit.injuries.length}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex-1 pl-2 overflow-y-auto">
            {selectedUnit ? (
              <div>
                <h3 className="text-md font-semibold">{selectedUnit.name}</h3>

                <InfoDivider />
                <h4 className="text-sm font-medium mt-2">Status</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                  <InfoRow label="Morale" value={`${selectedUnit.morale}%`} />
                  <InfoRow
                    label="Injuries"
                    value={selectedUnit.injuries.length}
                  />
                  <InfoRow
                    label="Experience (Theory)"
                    value={selectedUnit.experience_theory}
                  />
                  <InfoRow
                    label="Experience (Combat)"
                    value={selectedUnit.experience_combat}
                  />
                </div>

                <InfoDivider />
                <h4 className="text-sm font-medium mt-2">Leadership</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                  <InfoRow label="Leadership" value={selectedUnit.leadership} />
                  <InfoRow label="Courage" value={selectedUnit.courage} />
                  <InfoRow label="Tactics" value={selectedUnit.tactics} />
                  <InfoRow label="Teaching" value={selectedUnit.teacher} />
                </div>

                <InfoDivider />
                <h4 className="text-sm font-medium mt-2">Combat Skills</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                  <InfoRow label="Sword" value={selectedUnit.sword} />
                  <InfoRow label="Spear" value={selectedUnit.spear} />
                  <InfoRow label="Bow" value={selectedUnit.bow} />
                  <InfoRow label="Dodging" value={selectedUnit.dodging} />
                </div>

                <InfoDivider />
                <h4 className="text-sm font-medium mt-2">Physical</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                  <InfoRow label="Strength" value={selectedUnit.strength} />
                  <InfoRow label="Endurance" value={selectedUnit.endurance} />
                  <InfoRow label="Height" value={`${selectedUnit.height} cm`} />
                  <InfoRow label="Weight" value={`${selectedUnit.weight} kg`} />
                  <InfoRow
                    label="Aggressiveness"
                    value={selectedUnit.agressiveness}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a unit to view details
              </div>
            )}
          </div>
        </div>
      </InfoBox>

      <ResourceInfo group={group} tile={tile} className="h-full flex-1" />
    </div>
  );
};

export default GroupInfo;
