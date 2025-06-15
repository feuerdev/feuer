import { Unit } from "@shared/objects";
import { getTileByPos } from "@shared/objectutil";
import ResourceInfo from "./ResourceInfo";
import { InfoBox, InfoRow, InfoDivider } from "./InfoBox";
import { Button } from "./ui/Button";
import { useStore } from "@/lib/state";
import { UnitBehavior } from "@shared/objects";
import PlayerRelation from "./ui/PlayerRelation";

const UnitInfo = ({ unit }: { unit: Unit }) => {
  const world = useStore((state) => state.world);
  const engine = useStore((state) => state.engine);
  const userId = useStore((state) => state.userId);

  if (!unit) {
    return (
      <div className="p-4 text-slate-300">
        No unit selected or unit no longer exists
      </div>
    );
  }

  const isOwnUnit = unit.owner === userId;

  const tile = getTileByPos(unit.pos, world.tiles);

  if (!tile) {
    return <div>Unit is not on a tile?</div>;
  }

  // Get assigned building info if applicable
  const assignedBuilding =
    unit.assignedToBuilding !== undefined
      ? world.buildings[unit.assignedToBuilding]
      : undefined;

  const assignedSlot =
    assignedBuilding && unit.assignedToSlot !== undefined
      ? assignedBuilding.slots[unit.assignedToSlot]
      : undefined;

  return (
    <div className="inline-grid grid-cols-[minmax(250px,auto)_auto_auto] gap-2 p-2 h-full">
      <InfoBox title="Unit Details" className="h-full overflow-y-auto">
        <InfoRow label="Name" value={unit.name} />
        <InfoRow label="Position" value={`${unit.pos.q}:${unit.pos.r}`} />
        <InfoRow label="Owner" value={unit.owner} />
        <InfoRow
          label="Status"
          value={
            unit.targetHexes?.length > 0
              ? `Moving (${unit.movementStatus.toFixed(0)} %)`
              : assignedBuilding
              ? `Working at ${assignedBuilding.key}`
              : "Waiting"
          }
        />
        <InfoRow label="Spotting" value={unit.spotting} />
        <InfoRow label="Morale" value={`${unit.morale}%`} />

        {!isOwnUnit && <PlayerRelation playerId={unit.owner} />}

        {isOwnUnit && (
          <>
            <InfoDivider />
            <div>
              <label
                htmlFor={`behavior-select-${unit.id}`}
                className="block text-xs font-medium text-slate-400 mb-1"
              >
                Behavior:
              </label>
              <select
                id={`behavior-select-${unit.id}`}
                value={unit.behavior}
                onChange={(e) => {
                  const newBehavior = parseInt(e.target.value) as UnitBehavior;
                  engine.requestSetUnitBehavior(unit.id, newBehavior);
                }}
                className="block w-full rounded-md border-slate-600 bg-slate-700 py-1.5 text-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-xs"
              >
                {Object.values(UnitBehavior)
                  .filter((value) => typeof value === "number")
                  .map((value) => (
                    <option key={value as number} value={value as number}>
                      {UnitBehavior[value as number]}
                    </option>
                  ))}
              </select>
            </div>

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
                      onClick={() => engine.requestUnitUnassignment(unit.id)}
                    >
                      Unassign from Building
                    </Button>
                  </div>
                </div>
              </>
            )}

            <InfoDivider />
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">
                Gathering Efficiency
              </h3>
              <InfoRow
                label="Wood"
                value={`${(unit.gatheringEfficiency.wood * 100).toFixed(0)}%`}
              />
              <InfoRow
                label="Stone"
                value={`${(unit.gatheringEfficiency.stone * 100).toFixed(0)}%`}
              />
              <InfoRow
                label="Food"
                value={`${(unit.gatheringEfficiency.food * 100).toFixed(0)}%`}
              />
              <InfoRow
                label="Iron"
                value={`${(unit.gatheringEfficiency.iron * 100).toFixed(0)}%`}
              />
              <InfoRow
                label="Gold"
                value={`${(unit.gatheringEfficiency.gold * 100).toFixed(0)}%`}
              />
            </div>
          </>
        )}
      </InfoBox>

      <InfoBox title="Stats" className="h-full overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Combat Stats</h3>
            <InfoRow label="Morale" value={`${unit.morale.toFixed(1)}%`} />
            <InfoRow label="Initiative" value={unit.initiative} />
            <InfoRow label="Agility" value={unit.agility} />
            <InfoRow label="Intelligence" value={unit.intelligence} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Physical Stats</h3>
            <InfoRow label="Strength" value={Math.floor(unit.strength)} />
            <InfoRow label="Endurance" value={Math.floor(unit.endurance)} />
            <InfoRow label="Pain Thresh." value={unit.painThreshold} />
          </div>
        </div>
      </InfoBox>

      {isOwnUnit && (
        <ResourceInfo unit={unit} tile={tile} className="h-full" />
      )}
    </div>
  );
};

export default UnitInfo;
